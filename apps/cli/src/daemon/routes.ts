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
  isConnected,
  sendMessage as sendWhatsAppMessage,
  phoneToJid,
} from '../whatsapp/connection.js';
import { enqueueOrActivate, onInstanceTerminal } from '../engine/queue.js';
import { cancelHeartbeat, scheduleHeartbeat, suspendHeartbeat, resumeHeartbeat, getActiveTimerCount } from '../engine/heartbeat.js';
import { createSession, processWithAgent, destroySession, getSessionCount } from '../agent/session.js';
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
  const { model_api_key, model_provider, identity_file, soul_file } = body;

  if (typeof model_api_key === 'string') {
    await ConfigStore.updateConfig({ model_api_key });
  }
  if (typeof model_provider === 'string') {
    await ConfigStore.updateConfig({ model_provider });
  }
  if (typeof identity_file === 'string') {
    await ConfigStore.updateConfig({ identity_file });
  }
  if (typeof soul_file === 'string') {
    await ConfigStore.updateConfig({ soul_file });
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
 * GET /config
 * Return current relay configuration including file paths.
 */
async function handleGetConfig(res: http.ServerResponse): Promise<void> {
  const config = await ConfigStore.getConfig();
  sendJson(res, 200, { config });
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
    whatsapp_connected: isConnected(),
    active_instance_count: activeCount,
    total_instance_count: allInstances.length,
    active_timer_count: getActiveTimerCount(),
    session_count: getSessionCount(),
  };

  sendJson(res, 200, status);
}

/**
 * POST /instances
 * Create a new conversation instance.
 */
async function handleCreateInstance(body: Record<string, unknown>, res: http.ServerResponse): Promise<void> {
  const { objective, target_contact, todos, heartbeat_config } = body as {
    objective?: unknown;
    target_contact?: unknown;
    todos?: unknown;
    heartbeat_config?: unknown;
  };

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
  };

  const instance = await InstanceStore.create(instanceData);

  logger.info({ instanceId: instance.id, state: instance.state }, 'Instance created');

  // Check concurrency: queue if contact already has an active instance
  let finalState = instance.state;
  try {
    const queueResult = await enqueueOrActivate(instance);
    finalState = queueResult;
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Unknown error';
    logger.error({ instanceId: instance.id, error: errMsg }, 'Failed to enqueue/activate instance');
  }

  // If not queued, auto-activate: agent sends first message
  if (finalState === 'CREATED') {
    try {
      // Transition CREATED -> ACTIVE
      await transition(instance.id, 'agent_sends_first_message');

      // Create agent session and let agent send the first message
      await createSession(instance);
      await processWithAgent(instance.id, 'You are starting a new conversation. Send your first message to the contact to begin working on the objective.');

      // Schedule initial heartbeat
      scheduleHeartbeat(instance.id, instance.heartbeat_config.interval_ms);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      logger.error({ instanceId: instance.id, error: errMsg }, 'Failed to auto-activate instance');
    }
  }

  // Fetch updated instance to return actual state
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

  // Send via WhatsApp if connected
  if (isConnected()) {
    try {
      const jid = phoneToJid(instance.target_contact);
      await sendWhatsAppMessage(jid, message);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      logger.error({ instanceId: id, error: errMsg }, 'Failed to send message via WhatsApp');
      sendError(res, 500, 'Failed to send message via WhatsApp', errMsg);
      return;
    }
  } else {
    sendError(res, 503, 'WhatsApp is not connected. Run `relay init` to connect.');
    return;
  }

  const transcriptMessage: Omit<TranscriptMessage, 'id'> = {
    instance_id: id,
    role: 'manual',
    content: message,
    timestamp: new Date().toISOString(),
  };

  const savedMessage = await TranscriptStore.append(transcriptMessage);

  logger.debug({ instanceId: id, messageId: savedMessage.id }, 'Manual message sent via WhatsApp and appended to transcript');
  sendJson(res, 200, savedMessage);
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

    // GET /config
    if (method === 'GET' && route.base === 'config' && !route.id) {
      await handleGetConfig(res);
      return;
    }

    // GET /status
    if (method === 'GET' && route.base === 'status' && !route.id) {
      await handleGetStatus(res);
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
