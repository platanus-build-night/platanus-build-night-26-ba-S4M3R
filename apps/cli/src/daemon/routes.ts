import { v4 as uuidv4 } from 'uuid';
import type http from 'node:http';
import type {
  ConversationInstance,
  CreateInstanceRequest,
  CreateInstanceResponse,
  SendMessageRequest,
  TranscriptMessage,
  DaemonStatusResponse,
  ApiErrorResponse,
} from '../types.js';
import * as InstanceStore from '../store/instances.js';
import * as TranscriptStore from '../store/transcripts.js';
import * as ConfigStore from '../store/config.js';
import { transition } from '../engine/state-machine.js';
import type { StateEvent } from '../types.js';
import {
  connectWhatsApp,
  isConnected as isWhatsAppConnected,
  sendMessage as sendWhatsAppMessage,
  phoneToJid,
} from '../whatsapp/connection.js';
import {
  isConnected as isTelegramConnected,
  sendMessage as sendTelegramMessage,
  getChatIdForPhone,
  getRecentChatIds,
  registerChatMapping,
  connectTelegram,
} from '../telegram/connection.js';
import { enqueueOrActivate, onInstanceTerminal } from '../engine/queue.js';
import { cancelHeartbeat, scheduleHeartbeat, suspendHeartbeat, resumeHeartbeat, getActiveTimerCount } from '../engine/heartbeat.js';
import { createSession, processWithAgent, destroySession, getSessionCount } from '../agent/session.js';
import { createAgentAndCall } from '../elevenlabs/client.js';
import { startPolling, stopPolling } from '../elevenlabs/poller.js';
import type { ConversationChannel } from '../types.js';
import logger from '../utils/logger.js';

// ============================================
// Response Helpers
// ============================================

function sendJson(res: http.ServerResponse, statusCode: number, data: unknown): void {
  const body = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function sendError(res: http.ServerResponse, statusCode: number, error: string, details?: string): void {
  const errorResponse: ApiErrorResponse = { error };
  if (details) {
    errorResponse.details = details;
  }
  sendJson(res, statusCode, errorResponse);
}

// ============================================
// URL Parsing Helper
// ============================================

interface ParsedRoute {
  base: string;
  id: string | null;
  sub: string | null;
}

/**
 * Parses URL path to extract route components.
 * Patterns:
 *   /instances -> { base: 'instances', id: null, sub: null }
 *   /instances/:id -> { base: 'instances', id: ':id', sub: null }
 *   /instances/:id/transcript -> { base: 'instances', id: ':id', sub: 'transcript' }
 *   /status -> { base: 'status', id: null, sub: null }
 *   /init -> { base: 'init', id: null, sub: null }
 */
function parseRoute(urlPath: string): ParsedRoute {
  const segments = urlPath.replace(/^\/+|\/+$/g, '').split('/');
  return {
    base: segments[0] || '',
    id: segments[1] || null,
    sub: segments[2] || null,
  };
}

// ============================================
// Server Start Time (set by server.ts)
// ============================================

let serverStartTime: number = Date.now();

export function setServerStartTime(time: number): void {
  serverStartTime = time;
}

// ============================================
// Route Handlers
// ============================================

/**
 * POST /init
 * Save config (model_api_key, model_provider) and trigger WhatsApp connection.
 * The QR code is printed directly in the daemon's terminal by Baileys.
 */
async function handleInit(body: Record<string, unknown>, res: http.ServerResponse): Promise<void> {
  const { model_api_key, model_provider } = body;

  if (typeof model_api_key === 'string') {
    await ConfigStore.updateConfig({ model_api_key });
  }
  if (typeof model_provider === 'string') {
    await ConfigStore.updateConfig({ model_provider });
  }

  // Trigger WhatsApp connection/reconnection
  try {
    await connectWhatsApp();
    sendJson(res, 200, { whatsapp_qr_displayed: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error({ error: message }, 'Failed to initiate WhatsApp connection');
    sendJson(res, 200, { whatsapp_qr_displayed: false, error: message });
  }
}

/**
 * GET /status
 * Return DaemonStatusResponse with pid, uptime, real WhatsApp connection state, instance counts.
 */
async function handleGetStatus(res: http.ServerResponse): Promise<void> {
  const allInstances = await InstanceStore.getAll();

  const terminalStates = new Set(['COMPLETED', 'ABANDONED', 'FAILED']);
  const activeCount = allInstances.filter((inst) => !terminalStates.has(inst.state)).length;

  const uptimeSeconds = Math.floor((Date.now() - serverStartTime) / 1000);

  const status: DaemonStatusResponse & { active_timer_count: number; session_count: number } = {
    pid: process.pid,
    uptime_seconds: uptimeSeconds,
    whatsapp_connected: isWhatsAppConnected(),
    telegram_connected: isTelegramConnected(),
    active_instance_count: activeCount,
    total_instance_count: allInstances.length,
    active_timer_count: getActiveTimerCount(),
    session_count: getSessionCount(),
  };

  sendJson(res, 200, status);
}

/**
 * POST /instances
 * Create a new conversation instance (WhatsApp or phone channel).
 */
async function handleCreateInstance(body: Record<string, unknown>, res: http.ServerResponse): Promise<void> {
  const { objective, target_contact, todos, heartbeat_config, channel: rawChannel, phone_config } = body as {
    objective?: unknown;
    target_contact?: unknown;
    todos?: unknown;
    heartbeat_config?: unknown;
    channel?: unknown;
    phone_config?: unknown;
  };

  const channel: ConversationChannel = rawChannel === 'phone' ? 'phone' : rawChannel === 'telegram' ? 'telegram' : 'whatsapp';

  // Validate required fields
  if (typeof objective !== 'string' || !objective.trim()) {
    sendError(res, 400, 'Missing required field: objective');
    return;
  }
  if (typeof target_contact !== 'string' || !target_contact.trim()) {
    sendError(res, 400, 'Missing required field: target_contact');
    return;
  }
  if (!Array.isArray(todos) || todos.length === 0) {
    sendError(res, 400, 'Missing required field: todos (must be a non-empty array)');
    return;
  }

  // Validate each todo has a text field
  for (const todo of todos) {
    if (typeof todo !== 'object' || todo === null || typeof (todo as Record<string, unknown>).text !== 'string') {
      sendError(res, 400, 'Each todo must have a "text" field of type string');
      return;
    }
  }

  // Validate phone_config when channel is phone
  if (channel === 'phone') {
    const pc = phone_config as Record<string, unknown> | undefined;
    if (!pc || typeof pc.elevenlabs_api_key !== 'string' || typeof pc.phone_number_id !== 'string' || typeof pc.first_message !== 'string') {
      sendError(res, 400, 'phone_config with elevenlabs_api_key, phone_number_id, and first_message is required for phone channel');
      return;
    }
  }

  // Build todo items with generated UUIDs
  const todoItems = (todos as Array<{ text: string }>).map((t) => ({
    id: uuidv4(),
    text: t.text,
    status: 'pending' as const,
  }));

  // Merge heartbeat config with defaults
  const defaultHeartbeat = { interval_ms: 1800000, max_followups: 5 };
  const mergedHeartbeat = {
    ...defaultHeartbeat,
    ...(typeof heartbeat_config === 'object' && heartbeat_config !== null ? heartbeat_config : {}),
  };

  const instanceData: Omit<ConversationInstance, 'id' | 'created_at' | 'updated_at'> = {
    objective: objective as string,
    target_contact: target_contact as string,
    todos: todoItems,
    state: 'CREATED',
    previous_state: null,
    heartbeat_config: {
      interval_ms: typeof mergedHeartbeat.interval_ms === 'number' ? mergedHeartbeat.interval_ms : defaultHeartbeat.interval_ms,
      max_followups: typeof mergedHeartbeat.max_followups === 'number' ? mergedHeartbeat.max_followups : defaultHeartbeat.max_followups,
    },
    follow_up_count: 0,
    failure_reason: null,
    channel,
  };

  const instance = await InstanceStore.create(instanceData);

  logger.info({ instanceId: instance.id, state: instance.state, channel }, 'Instance created');

  if (channel === 'phone') {
    // Phone channel: create ElevenLabs agent and place call
    await activatePhoneInstance(instance, phone_config as Record<string, unknown>, res);
  } else if (channel === 'telegram') {
    // Telegram channel: same flow as WhatsApp but via Telegram bot
    await activateTelegramInstance(instance, body, res);
  } else {
    // WhatsApp channel: existing flow
    await activateWhatsAppInstance(instance, res);
  }
}

/**
 * Activate a WhatsApp channel instance (existing behavior).
 */
async function activateWhatsAppInstance(instance: ConversationInstance, res: http.ServerResponse): Promise<void> {
  let finalState = instance.state;
  try {
    const queueResult = await enqueueOrActivate(instance);
    finalState = queueResult;
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Unknown error';
    logger.error({ instanceId: instance.id, error: errMsg }, 'Failed to enqueue/activate instance');
  }

  if (finalState === 'CREATED') {
    try {
      await transition(instance.id, 'agent_sends_first_message');
      await createSession(instance);
      await processWithAgent(instance.id, 'You are starting a new conversation. Send your first message to the contact to begin working on the objective.');
      scheduleHeartbeat(instance.id, instance.heartbeat_config.interval_ms);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      logger.error({ instanceId: instance.id, error: errMsg }, 'Failed to auto-activate instance');
    }
  }

  const updatedInstance = await InstanceStore.getById(instance.id);
  const response: CreateInstanceResponse = {
    id: instance.id,
    state: updatedInstance?.state ?? finalState,
  };
  sendJson(res, 201, response);
}

/**
 * Activate a phone channel instance: create ElevenLabs agent, place call, start polling.
 */
async function activatePhoneInstance(
  instance: ConversationInstance,
  phoneConfig: Record<string, unknown>,
  res: http.ServerResponse,
): Promise<void> {
  const apiKey = phoneConfig.elevenlabs_api_key as string;
  const phoneNumberId = phoneConfig.phone_number_id as string;
  const firstMessage = phoneConfig.first_message as string;
  const voiceId = typeof phoneConfig.voice_id === 'string' ? phoneConfig.voice_id : undefined;
  const language = typeof phoneConfig.language === 'string' ? phoneConfig.language : undefined;

  try {
    // Transition CREATED -> ACTIVE
    await transition(instance.id, 'agent_sends_first_message');

    // Build prompt from objective + todos
    const todosText = instance.todos.map((t) => `- ${t.text}`).join('\n');
    const prompt = `You are a voice agent calling on behalf of relay. Your objective: ${instance.objective}\n\nTodo items to address:\n${todosText}\n\nBe professional and concise. Work through the todo items during the conversation.`;

    // Create agent and place call
    const callResult = await createAgentAndCall(apiKey, {
      prompt,
      first_message: firstMessage,
      phone_number_id: phoneNumberId,
      to_number: instance.target_contact,
      voice_id: voiceId,
      language,
    });

    // Store ElevenLabs data on the instance
    await InstanceStore.update(instance.id, {
      elevenlabs_data: {
        agent_id: callResult.agent_id,
        conversation_id: callResult.conversation_id,
        call_sid: callResult.callSid,
      },
    });

    // Start polling for call completion
    startPolling(instance.id, callResult.conversation_id, apiKey);

    logger.info(
      { instanceId: instance.id, agentId: callResult.agent_id, conversationId: callResult.conversation_id },
      'Phone call instance activated',
    );

    const updatedInstance = await InstanceStore.getById(instance.id);
    const response: CreateInstanceResponse = {
      id: instance.id,
      state: updatedInstance?.state ?? 'ACTIVE',
    };
    sendJson(res, 201, response);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Unknown error';
    logger.error({ instanceId: instance.id, error: errMsg }, 'Failed to activate phone instance');

    await transition(instance.id, 'unrecoverable_error');
    await InstanceStore.update(instance.id, { failure_reason: errMsg });

    sendError(res, 502, 'Failed to place call via ElevenLabs', errMsg);
  }
}

/**
 * Activate a Telegram channel instance.
 * Same flow as WhatsApp: enqueue/activate, create session, send first message.
 */
async function activateTelegramInstance(
  instance: ConversationInstance,
  body: Record<string, unknown>,
  res: http.ServerResponse,
): Promise<void> {
  // Resolve telegram_chat_id: from request body, phone mapping, or recent chats
  let telegramChatId = body.telegram_chat_id as string | undefined;
  if (!telegramChatId) {
    // Try phone-to-chatId mapping
    const mapped = getChatIdForPhone(instance.target_contact);
    if (mapped) {
      telegramChatId = mapped;
    } else {
      // If only one person has messaged the bot, use that chat ID
      const recent = getRecentChatIds();
      if (recent.length === 1) {
        telegramChatId = recent[0];
        logger.info({ chatId: telegramChatId }, 'Auto-discovered Telegram chat ID from recent messages');
      }
    }
  }
  if (telegramChatId) {
    await InstanceStore.update(instance.id, { telegram_chat_id: telegramChatId });
    // Also register the mapping so agent send_message can find it
    registerChatMapping(instance.target_contact, telegramChatId);
  }

  let finalState = instance.state;
  try {
    const queueResult = await enqueueOrActivate(instance);
    finalState = queueResult;
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Unknown error';
    logger.error({ instanceId: instance.id, error: errMsg }, 'Failed to enqueue/activate Telegram instance');
  }

  if (finalState === 'CREATED') {
    try {
      await transition(instance.id, 'agent_sends_first_message');
      await createSession(instance);
      await processWithAgent(instance.id, 'You are starting a new conversation. Send your first message to the contact to begin working on the objective.');
      scheduleHeartbeat(instance.id, instance.heartbeat_config.interval_ms);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      logger.error({ instanceId: instance.id, error: errMsg }, 'Failed to auto-activate Telegram instance');
    }
  }

  const updatedInstance = await InstanceStore.getById(instance.id);
  const response: CreateInstanceResponse = {
    id: instance.id,
    state: updatedInstance?.state ?? finalState,
  };
  sendJson(res, 201, response);
}

/**
 * GET /instances
 * Return all instances.
 */
async function handleListInstances(res: http.ServerResponse): Promise<void> {
  const instances = await InstanceStore.getAll();
  sendJson(res, 200, instances);
}

/**
 * GET /instances/:id
 * Return a single instance by ID.
 */
async function handleGetInstance(id: string, res: http.ServerResponse): Promise<void> {
  const instance = await InstanceStore.getById(id);
  if (!instance) {
    sendError(res, 404, 'Instance not found', `No instance with id: ${id}`);
    return;
  }
  sendJson(res, 200, instance);
}

/**
 * GET /instances/:id/transcript
 * Return transcript messages for an instance.
 */
async function handleGetTranscript(id: string, res: http.ServerResponse): Promise<void> {
  const instance = await InstanceStore.getById(id);
  if (!instance) {
    sendError(res, 404, 'Instance not found', `No instance with id: ${id}`);
    return;
  }

  const messages = await TranscriptStore.getByInstance(id);
  sendJson(res, 200, messages);
}

/**
 * POST /instances/:id/cancel
 * Trigger cancel event on state machine.
 */
async function handleCancel(id: string, res: http.ServerResponse): Promise<void> {
  const instance = await InstanceStore.getById(id);
  if (!instance) {
    sendError(res, 404, 'Instance not found', `No instance with id: ${id}`);
    return;
  }

  // Stop polling if phone channel
  if (instance.channel === 'phone') {
    stopPolling(id);
  }

  const result = await transition(id, 'cancel' as StateEvent);
  if (!result.success) {
    sendError(res, 409, 'Invalid state transition', result.error);
    return;
  }

  // Terminal state cleanup (heartbeat cancel, session destroy, queue dequeue)
  // is handled automatically by the terminal state hook in the state machine.

  sendJson(res, 200, result.instance);
}

/**
 * POST /instances/:id/pause
 * Trigger pause event on state machine.
 */
async function handlePause(id: string, res: http.ServerResponse): Promise<void> {
  const instance = await InstanceStore.getById(id);
  if (!instance) {
    sendError(res, 404, 'Instance not found', `No instance with id: ${id}`);
    return;
  }

  const result = await transition(id, 'pause' as StateEvent);
  if (!result.success) {
    sendError(res, 409, 'Invalid state transition', result.error);
    return;
  }

  // Suspend heartbeat timer while paused
  try {
    suspendHeartbeat(id);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Unknown error';
    logger.error({ instanceId: id, error: errMsg }, 'Error suspending heartbeat on pause');
  }

  sendJson(res, 200, result.instance);
}

/**
 * POST /instances/:id/resume
 * Trigger resume event on state machine.
 */
async function handleResume(id: string, res: http.ServerResponse): Promise<void> {
  const instance = await InstanceStore.getById(id);
  if (!instance) {
    sendError(res, 404, 'Instance not found', `No instance with id: ${id}`);
    return;
  }

  const result = await transition(id, 'resume' as StateEvent);
  if (!result.success) {
    sendError(res, 409, 'Invalid state transition', result.error);
    return;
  }

  // Resume heartbeat if returning to a state that needs it
  try {
    await resumeHeartbeat(id);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Unknown error';
    logger.error({ instanceId: id, error: errMsg }, 'Error resuming heartbeat');
  }

  sendJson(res, 200, result.instance);
}

/**
 * POST /instances/:id/send
 * Manual message injection -- store in transcript as 'manual' role and deliver via WhatsApp.
 */
async function handleSend(id: string, body: Record<string, unknown>, res: http.ServerResponse): Promise<void> {
  const instance = await InstanceStore.getById(id);
  if (!instance) {
    sendError(res, 404, 'Instance not found', `No instance with id: ${id}`);
    return;
  }

  const { message } = body as { message?: unknown };
  if (typeof message !== 'string' || !message.trim()) {
    sendError(res, 400, 'Missing required field: message');
    return;
  }

  // Send via the appropriate channel
  if (instance.channel === 'telegram') {
    if (!isTelegramConnected()) {
      sendError(res, 503, 'Telegram bot is not connected. Run `relay-agent telegram login` to connect.');
      return;
    }
    const chatId = instance.telegram_chat_id ?? getChatIdForPhone(instance.target_contact);
    if (!chatId) {
      sendError(res, 400, 'No Telegram chat ID for this contact. The contact must message the bot first.');
      return;
    }
    try {
      await sendTelegramMessage(chatId, message);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      logger.error({ instanceId: id, error: errMsg }, 'Failed to send message via Telegram');
      sendError(res, 500, 'Failed to send message via Telegram', errMsg);
      return;
    }
  } else {
    if (!isWhatsAppConnected()) {
      sendError(res, 503, 'WhatsApp is not connected. Run `relay init` to connect.');
      return;
    }
    try {
      const jid = phoneToJid(instance.target_contact);
      await sendWhatsAppMessage(jid, message);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      logger.error({ instanceId: id, error: errMsg }, 'Failed to send message via WhatsApp');
      sendError(res, 500, 'Failed to send message via WhatsApp', errMsg);
      return;
    }
  }

  const transcriptMessage: Omit<TranscriptMessage, 'id'> = {
    instance_id: id,
    role: 'manual',
    content: message,
    timestamp: new Date().toISOString(),
  };

  const savedMessage = await TranscriptStore.append(transcriptMessage);

  logger.debug({ instanceId: id, messageId: savedMessage.id }, 'Manual message sent and appended to transcript');
  sendJson(res, 200, savedMessage);
}

/**
 * POST /call
 * Creates a temporary ElevenLabs agent and places an outbound call.
 */
async function handleCall(body: Record<string, unknown>, res: http.ServerResponse): Promise<void> {
  const { to_number, phone_number_id, prompt, first_message, elevenlabs_api_key, voice_id, language } = body;

  if (typeof to_number !== 'string' || !to_number.trim()) {
    sendError(res, 400, 'Missing required field: to_number');
    return;
  }
  if (typeof phone_number_id !== 'string' || !phone_number_id.trim()) {
    sendError(res, 400, 'Missing required field: phone_number_id');
    return;
  }
  if (typeof prompt !== 'string' || !prompt.trim()) {
    sendError(res, 400, 'Missing required field: prompt');
    return;
  }
  if (typeof first_message !== 'string' || !first_message.trim()) {
    sendError(res, 400, 'Missing required field: first_message');
    return;
  }
  if (typeof elevenlabs_api_key !== 'string' || !elevenlabs_api_key.trim()) {
    sendError(res, 400, 'Missing required field: elevenlabs_api_key');
    return;
  }

  try {
    const result = await createAgentAndCall(elevenlabs_api_key, {
      prompt,
      first_message,
      phone_number_id,
      to_number,
      voice_id: typeof voice_id === 'string' ? voice_id : undefined,
      language: typeof language === 'string' ? language : undefined,
    });

    logger.info(
      { to_number, agent_id: result.agent_id, conversation_id: result.conversation_id },
      'Agent created and outbound call placed via ElevenLabs',
    );
    sendJson(res, 200, result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error({ to_number, error: message }, 'Failed to create agent and place call');
    sendError(res, 502, 'Failed to place call via ElevenLabs', message);
  }
}

// ============================================
// Main Router
// ============================================

/**
 * Routes an incoming HTTP request to the appropriate handler.
 * Returns true if a route matched, false if not found.
 */
export async function handleRequest(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  body: Record<string, unknown>,
): Promise<void> {
  const method = req.method ?? 'GET';
  const urlPath = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`).pathname;
  const route = parseRoute(urlPath);

  try {
    // POST /init
    if (method === 'POST' && route.base === 'init' && !route.id) {
      await handleInit(body, res);
      return;
    }

    // GET /status
    if (method === 'GET' && route.base === 'status' && !route.id) {
      await handleGetStatus(res);
      return;
    }

    // POST /call
    if (method === 'POST' && route.base === 'call' && !route.id) {
      await handleCall(body, res);
      return;
    }

    // POST /instances (create)
    if (method === 'POST' && route.base === 'instances' && !route.id) {
      await handleCreateInstance(body, res);
      return;
    }

    // GET /instances (list)
    if (method === 'GET' && route.base === 'instances' && !route.id) {
      await handleListInstances(res);
      return;
    }

    // GET /instances/:id/transcript
    if (method === 'GET' && route.base === 'instances' && route.id && route.sub === 'transcript') {
      await handleGetTranscript(route.id, res);
      return;
    }

    // GET /instances/:id
    if (method === 'GET' && route.base === 'instances' && route.id && !route.sub) {
      await handleGetInstance(route.id, res);
      return;
    }

    // POST /instances/:id/cancel
    if (method === 'POST' && route.base === 'instances' && route.id && route.sub === 'cancel') {
      await handleCancel(route.id, res);
      return;
    }

    // POST /instances/:id/pause
    if (method === 'POST' && route.base === 'instances' && route.id && route.sub === 'pause') {
      await handlePause(route.id, res);
      return;
    }

    // POST /instances/:id/resume
    if (method === 'POST' && route.base === 'instances' && route.id && route.sub === 'resume') {
      await handleResume(route.id, res);
      return;
    }

    // POST /instances/:id/send
    if (method === 'POST' && route.base === 'instances' && route.id && route.sub === 'send') {
      await handleSend(route.id, body, res);
      return;
    }

    // No route matched
    sendError(res, 404, 'Not found', `No route for ${method} ${urlPath}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error({ method, url: urlPath, error: message }, 'Unhandled route error');
    sendError(res, 500, 'Internal server error', message);
  }
}
