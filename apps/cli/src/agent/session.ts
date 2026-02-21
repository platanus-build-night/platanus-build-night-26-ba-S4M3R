import fs from 'node:fs';
import Anthropic from '@anthropic-ai/sdk';
import type { MessageParam, Tool, ToolResultBlockParam } from '@anthropic-ai/sdk/resources/messages';
import OpenAI from 'openai';
import type { ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources/chat/completions';
import { AuthStorage } from '@mariozechner/pi-coding-agent';
import type { ConversationInstance, RelayConfig, StateEvent, TranscriptMessage } from '../types.js';
import * as WhatsApp from '../whatsapp/connection.js';
import * as Telegram from '../telegram/connection.js';
import * as InstanceStore from '../store/instances.js';
import * as TranscriptStore from '../store/transcripts.js';
import * as ConfigStore from '../store/config.js';
import { transition } from '../engine/state-machine.js';
import { createAgentAndCall } from '../elevenlabs/client.js';
import logger from '../utils/logger.js';

// ============================================
// Session Dependencies (for DI / testability)
// ============================================

export interface SessionDependencies {
  getInstanceById: (id: string) => Promise<ConversationInstance | null>;
  getTranscriptByInstance: (instanceId: string) => Promise<TranscriptMessage[]>;
  getConfig: () => Promise<RelayConfig>;
  transition: (instanceId: string, event: StateEvent) => Promise<{ success: boolean; error?: string }>;
}

const defaultDeps: SessionDependencies = {
  getInstanceById: InstanceStore.getById,
  getTranscriptByInstance: TranscriptStore.getByInstance,
  getConfig: ConfigStore.getConfig,
  transition,
};

// ============================================
// Provider abstraction
// ============================================

type Provider = 'anthropic' | 'openai';

interface AgentSessionState {
  provider: Provider;
  anthropicClient?: Anthropic;
  openaiClient?: OpenAI;
  model: string;
  systemPrompt: string;
  // Anthropic uses its own message format; OpenAI uses ChatCompletionMessageParam
  anthropicMessages: MessageParam[];
  openaiMessages: ChatCompletionMessageParam[];
  instanceId: string;
  contactJid: string;
}

const sessions = new Map<string, AgentSessionState>();

// ============================================
// Tool Definitions (shared logic, dual format)
// ============================================

const TOOL_DEFS = [
  {
    name: 'send_message',
    description: 'Send a text message to the contact via WhatsApp.',
    parameters: {
      type: 'object' as const,
      properties: {
        text: { type: 'string', description: 'The text message to send to the contact' },
      },
      required: ['text'],
    },
  },
  {
    name: 'mark_todo_item',
    description: 'Update the status of a todo item. Valid statuses: pending, in_progress, completed, skipped.',
    parameters: {
      type: 'object' as const,
      properties: {
        todo_id: { type: 'string', description: 'The ID of the todo item to update' },
        status: { type: 'string', enum: ['pending', 'in_progress', 'completed', 'skipped'], description: 'The new status' },
      },
      required: ['todo_id', 'status'],
    },
  },
  {
    name: 'end_conversation',
    description: 'Mark the conversation as completed.',
    parameters: {
      type: 'object' as const,
      properties: {
        reason: { type: 'string', description: 'The reason for ending the conversation' },
      },
      required: ['reason'],
    },
  },
  {
    name: 'request_human_intervention',
    description: 'Flag the conversation for human review.',
    parameters: {
      type: 'object' as const,
      properties: {
        reason: { type: 'string', description: 'The reason human intervention is needed' },
      },
      required: ['reason'],
    },
  },
  {
    name: 'schedule_next_heartbeat',
    description: 'Override the delay before the next heartbeat fires.',
    parameters: {
      type: 'object' as const,
      properties: {
        delay_ms: { type: 'number', description: 'Delay in milliseconds before the next heartbeat' },
      },
      required: ['delay_ms'],
    },
  },
  {
    name: 'escalate_to_call',
    description: 'Escalate the current WhatsApp conversation to a live phone call. Creates a voice agent with the full conversation context and calls the contact. Use when a phone call would be more effective than texting.',
    parameters: {
      type: 'object' as const,
      properties: {
        reason: { type: 'string', description: 'Why you are escalating from WhatsApp to a phone call' },
        extra_context: { type: 'string', description: 'Additional context or instructions for the voice agent beyond the conversation history' },
        first_message: { type: 'string', description: 'The first thing the voice agent should say when the contact picks up' },
        language: { type: 'string', description: 'Language code (e.g., "en", "es"). Defaults to "en"' },
      },
      required: ['reason', 'first_message'],
    },
  },
];

// Anthropic format
const ANTHROPIC_TOOLS: Tool[] = TOOL_DEFS.map((t) => ({
  name: t.name,
  description: t.description,
  input_schema: t.parameters,
}));

// OpenAI format
const OPENAI_TOOLS: ChatCompletionTool[] = TOOL_DEFS.map((t) => ({
  type: 'function' as const,
  function: {
    name: t.name,
    description: t.description,
    parameters: t.parameters,
  },
}));

// ============================================
// Tool Executor
// ============================================

async function executeTool(
  toolName: string,
  input: Record<string, unknown>,
  instanceId: string,
  contactJid: string,
): Promise<string> {
  switch (toolName) {
    case 'send_message': {
      const text = input.text as string;
      // Route to correct channel
      const inst = await InstanceStore.getById(instanceId);
      if (inst?.channel === 'telegram') {
        const chatId = inst.telegram_chat_id ?? Telegram.getChatIdForPhone(inst.target_contact);
        if (!chatId) {
          return JSON.stringify({ success: false, error: 'No Telegram chat ID for this contact. The contact must message the bot first.' });
        }
        await Telegram.sendMessage(chatId, text);
      } else {
        await WhatsApp.sendMessage(contactJid, text);
      }
      await TranscriptStore.append({
        instance_id: instanceId,
        role: 'agent',
        content: text,
        timestamp: new Date().toISOString(),
      });
      const result = await transition(instanceId, 'message_sent');
      if (!result.success) {
        logger.warn({ instanceId, error: result.error }, 'State transition failed after send_message');
      }
      logger.info({ instanceId, textLength: text.length }, 'Agent sent message via WhatsApp');
      return JSON.stringify({ success: true });
    }

    case 'mark_todo_item': {
      const { todo_id, status } = input as { todo_id: string; status: string };
      const instance = await InstanceStore.getById(instanceId);
      if (!instance) return JSON.stringify({ success: false, error: 'Instance not found' });
      const todo = instance.todos.find((t) => t.id === todo_id);
      if (!todo) return JSON.stringify({ success: false, error: `Todo not found: ${todo_id}` });
      todo.status = status as 'pending' | 'in_progress' | 'completed' | 'skipped';
      await InstanceStore.update(instanceId, { todos: instance.todos });
      logger.info({ instanceId, todo_id, status }, 'Todo item updated');
      return JSON.stringify({ success: true, todo_id, new_status: status });
    }

    case 'end_conversation': {
      const reason = input.reason as string;
      const result = await transition(instanceId, 'end_conversation');
      if (!result.success) return JSON.stringify({ success: false, error: result.error });
      logger.info({ instanceId, reason }, 'Conversation ended');
      return JSON.stringify({ success: true, reason });
    }

    case 'request_human_intervention': {
      const reason = input.reason as string;
      const result = await transition(instanceId, 'request_intervention');
      if (!result.success) return JSON.stringify({ success: false, error: result.error });
      logger.info({ instanceId, reason }, 'Human intervention requested');
      return JSON.stringify({ success: true, reason });
    }

    case 'schedule_next_heartbeat': {
      const delay_ms = input.delay_ms as number;
      const { heartbeatOverrides } = await import('./tools.js');
      heartbeatOverrides.set(instanceId, delay_ms);
      logger.info({ instanceId, delay_ms }, 'Heartbeat override scheduled');
      return JSON.stringify({ success: true, delay_ms });
    }

    case 'escalate_to_call': {
      const { reason, extra_context, first_message, language } = input as {
        reason: string;
        extra_context?: string;
        first_message: string;
        language?: string;
      };

      const apiKey = process.env.ELEVENLABS_API_KEY;
      if (!apiKey) return JSON.stringify({ success: false, error: 'ELEVENLABS_API_KEY not set' });
      const phoneNumberId = process.env.ELEVENLABS_PHONE_NUMBER_ID;
      if (!phoneNumberId) return JSON.stringify({ success: false, error: 'ELEVENLABS_PHONE_NUMBER_ID not set' });

      const instance = await InstanceStore.getById(instanceId);
      if (!instance) return JSON.stringify({ success: false, error: 'Instance not found' });

      const transcript = await TranscriptStore.getByInstance(instanceId);
      const conversationHistory = transcript
        .map((msg) => `[${msg.role === 'agent' ? 'You' : 'Contact'}]: ${msg.content}`)
        .join('\n');

      const todosFormatted = instance.todos
        .map((t) => `- [${t.status}] ${t.text}`)
        .join('\n');

      const voicePrompt = [
        `You are a voice agent continuing a conversation that was happening over WhatsApp.`,
        `You are now calling the contact to continue the conversation by phone.`,
        ``,
        `OBJECTIVE: ${instance.objective}`,
        ``,
        `TODO LIST:`,
        todosFormatted || '(no items)',
        ``,
        `REASON FOR CALLING: ${reason}`,
        ``,
        `PREVIOUS WHATSAPP CONVERSATION:`,
        conversationHistory || '(no messages yet)',
        extra_context ? `\nADDITIONAL CONTEXT:\n${extra_context}` : '',
        ``,
        `RULES:`,
        `- Continue naturally from where the WhatsApp conversation left off`,
        `- Reference previous messages if relevant`,
        `- Be professional and concise`,
        `- Focus on completing the objective and outstanding todo items`,
      ].join('\n');

      try {
        const result = await createAgentAndCall(apiKey, {
          prompt: voicePrompt,
          first_message,
          phone_number_id: phoneNumberId,
          to_number: instance.target_contact,
          language: language ?? 'en',
          agent_name: `relay-escalation-${instanceId.slice(0, 8)}`,
        });

        await InstanceStore.update(instanceId, {
          elevenlabs_data: {
            agent_id: result.agent_id,
            conversation_id: result.conversation_id,
            call_sid: result.callSid,
          },
        });

        logger.info({ instanceId, agent_id: result.agent_id, reason }, 'Escalated to phone call');
        return JSON.stringify({ success: true, agent_id: result.agent_id, conversation_id: result.conversation_id });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        logger.error({ instanceId, error: msg }, 'escalate_to_call failed');
        return JSON.stringify({ success: false, error: msg });
      }
    }

    default:
      return JSON.stringify({ success: false, error: `Unknown tool: ${toolName}` });
  }
}

// ============================================
// System Prompt Builder
// ============================================

function loadFileContent(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, 'utf-8').trim() || null;
  } catch {
    return null;
  }
}

export function buildSystemPrompt(
  instance: ConversationInstance,
  identityContent?: string | null,
  soulContent?: string | null,
): string {
  const parts: string[] = [];

  if (identityContent) {
    parts.push(identityContent);
  }

  if (soulContent) {
    parts.push(soulContent);
  }

  const todosFormatted = instance.todos
    .map((todo) => `- [${todo.status}] ${todo.text} (id: ${todo.id})`)
    .join('\n');

  const channelName = instance.channel === 'telegram' ? 'Telegram' : 'WhatsApp';

  parts.push(`You are a conversation agent executing a specific objective via ${channelName}.

OBJECTIVE: ${instance.objective}

TODO LIST:
${todosFormatted || '(no todo items)'}

RULES:
- Only discuss topics related to the objective
- Never reveal you are an AI agent unless asked directly
- Be professional and concise
- Use send_message to send messages to the contact
- Use mark_todo_item to update todo statuses when information is gathered
- Use end_conversation when all todos are complete or the objective is fulfilled
- If you cannot proceed, use request_human_intervention
- If a phone call would be more effective (e.g., contact is unresponsive, complex discussion needed, or urgency requires it), use escalate_to_call to call the contact directly with full conversation context
- Always call send_message to communicate — do NOT just produce text output`);

  return parts.join('\n\n');
}

export function buildTranscriptContext(transcript: TranscriptMessage[]): string {
  if (transcript.length === 0) return '';
  const lines = transcript.map((msg) => {
    const roleLabel = msg.role === 'agent' ? 'You' : msg.role === 'contact' ? 'Contact' : msg.role;
    return `[${roleLabel}]: ${msg.content}`;
  });
  return `\nCONVERSATION HISTORY:\n${lines.join('\n')}`;
}

// ============================================
// Provider + API Key Resolution
// ============================================

interface ResolvedConfig {
  provider: Provider;
  apiKey?: string;
  authToken?: string;  // OAuth token (Claude/Codex subscription)
  model: string;
  authSource: string;  // For logging
}

// ============================================
// OAuth via pi-mono AuthStorage (handles refresh + locking)
// ============================================

let _authStorage: ReturnType<typeof AuthStorage.create> | null = null;
function getAuthStorage() {
  if (!_authStorage) _authStorage = AuthStorage.create();
  return _authStorage;
}

// ============================================
// Config Resolution (priority chain)
// ============================================

async function resolveConfig(config: { model_api_key: string | null; model_provider: string | null }): Promise<ResolvedConfig> {
  const provider = (config.model_provider ?? 'anthropic') as Provider;

  // 1. Explicit API key from relay init
  if (config.model_api_key) {
    if (provider === 'openai') {
      return { provider: 'openai', apiKey: config.model_api_key, model: 'gpt-4o', authSource: 'relay init (openai)' };
    }
    return { provider: 'anthropic', apiKey: config.model_api_key, model: 'claude-sonnet-4-20250514', authSource: 'relay init (anthropic)' };
  }

  // 2. Environment variables
  if (provider === 'openai' && process.env.OPENAI_API_KEY) {
    return { provider: 'openai', apiKey: process.env.OPENAI_API_KEY, model: 'gpt-4o', authSource: 'OPENAI_API_KEY env' };
  }
  if (process.env.ANTHROPIC_API_KEY) {
    return { provider: 'anthropic', apiKey: process.env.ANTHROPIC_API_KEY, model: 'claude-sonnet-4-20250514', authSource: 'ANTHROPIC_API_KEY env' };
  }

  // 3. Claude subscription (OAuth via pi-mono AuthStorage - auto-refreshes)
  const auth = getAuthStorage();
  const anthropicKey = await auth.getApiKey('anthropic');
  if (anthropicKey) {
    // OAuth tokens start with sk-ant-oat, API keys start with sk-ant-api
    const isOAuth = anthropicKey.startsWith('sk-ant-oat');
    return {
      provider: 'anthropic',
      ...(isOAuth ? { authToken: anthropicKey } : { apiKey: anthropicKey }),
      model: 'claude-sonnet-4-20250514',
      authSource: isOAuth ? 'Claude subscription (OAuth)' : 'Anthropic API key (auth.json)',
    };
  }

  // 4. Codex subscription (OAuth via pi-mono AuthStorage)
  const codexKey = await auth.getApiKey('openai-codex');
  if (codexKey) {
    return { provider: 'openai', apiKey: codexKey, model: 'gpt-4o', authSource: 'Codex subscription (OAuth)' };
  }

  throw new Error(
    'No API key or subscription found. Options:\n' +
    '  1. relay init --api-key KEY --provider anthropic\n' +
    '  2. Set ANTHROPIC_API_KEY or OPENAI_API_KEY env var\n' +
    '  3. Login to Claude Code (pi login) for subscription access\n' +
    '  4. Login to Codex (pi login) for ChatGPT subscription access',
  );
}

// ============================================
// Session Factory
// ============================================

export async function createSession(
  instance: ConversationInstance,
  deps: SessionDependencies = defaultDeps,
): Promise<AgentSessionState> {
  const config = await deps.getConfig();
  const transcript = await deps.getTranscriptByInstance(instance.id);

  // Load identity and soul file contents
  const identityContent = config.identity_file ? loadFileContent(config.identity_file) : null;
  const soulContent = config.soul_file ? loadFileContent(config.soul_file) : null;

  const systemPrompt = buildSystemPrompt(instance, identityContent, soulContent);
  const transcriptContext = buildTranscriptContext(transcript);
  const fullPrompt = transcriptContext ? `${systemPrompt}\n${transcriptContext}` : systemPrompt;

  const resolved = await resolveConfig(config);
  const contactJid = `${instance.target_contact.replace('+', '')}@s.whatsapp.net`;

  const state: AgentSessionState = {
    provider: resolved.provider,
    model: resolved.model,
    systemPrompt: fullPrompt,
    anthropicMessages: [],
    openaiMessages: [],
    instanceId: instance.id,
    contactJid,
  };

  if (resolved.provider === 'anthropic') {
    if (resolved.authToken) {
      // OAuth subscription: requires special beta headers
      state.anthropicClient = new Anthropic({
        apiKey: null as unknown as string,
        authToken: resolved.authToken,
        defaultHeaders: {
          'anthropic-dangerous-direct-browser-access': 'true',
          'anthropic-beta': 'claude-code-20250219,oauth-2025-04-20',
          'user-agent': 'relay-agent/0.1.0',
        },
      });
    } else {
      state.anthropicClient = new Anthropic({ apiKey: resolved.apiKey! });
    }
  } else {
    state.openaiClient = new OpenAI({ apiKey: resolved.authToken ?? resolved.apiKey! });
  }

  logger.info({ authSource: resolved.authSource }, 'Using auth source');

  sessions.set(instance.id, state);

  logger.info(
    { instanceId: instance.id, provider: resolved.provider, model: resolved.model, promptLength: fullPrompt.length },
    'Agent session created',
  );

  return state;
}

// ============================================
// Anthropic agentic loop
// ============================================

async function runAnthropicLoop(state: AgentSessionState): Promise<void> {
  const client = state.anthropicClient!;
  const MAX_ROUNDS = 10;

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const response = await client.messages.create({
      model: state.model,
      max_tokens: 1024,
      system: state.systemPrompt,
      tools: ANTHROPIC_TOOLS,
      messages: state.anthropicMessages,
    });

    logger.info(
      { instanceId: state.instanceId, round, stopReason: response.stop_reason },
      'Anthropic API response',
    );

    state.anthropicMessages.push({ role: 'assistant', content: response.content });

    if (response.stop_reason !== 'tool_use') break;

    const toolResults: ToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type === 'tool_use') {
        logger.info({ instanceId: state.instanceId, tool: block.name, input: block.input }, 'Executing tool');
        const result = await executeTool(block.name, block.input as Record<string, unknown>, state.instanceId, state.contactJid);
        toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result });
      }
    }

    state.anthropicMessages.push({ role: 'user', content: toolResults });
  }
}

// ============================================
// OpenAI agentic loop
// ============================================

async function runOpenAILoop(state: AgentSessionState): Promise<void> {
  const client = state.openaiClient!;
  const MAX_ROUNDS = 10;

  // Ensure system message is first
  if (state.openaiMessages.length === 0 || state.openaiMessages[0].role !== 'system') {
    state.openaiMessages.unshift({ role: 'system', content: state.systemPrompt });
  }

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const response = await client.chat.completions.create({
      model: state.model,
      max_tokens: 1024,
      tools: OPENAI_TOOLS,
      messages: state.openaiMessages,
    });

    const choice = response.choices[0];
    if (!choice) break;

    logger.info(
      { instanceId: state.instanceId, round, finishReason: choice.finish_reason },
      'OpenAI API response',
    );

    state.openaiMessages.push(choice.message);

    if (choice.finish_reason !== 'tool_calls' || !choice.message.tool_calls?.length) break;

    for (const toolCall of choice.message.tool_calls) {
      if (toolCall.type !== 'function') continue;
      const fn = toolCall.function;
      const args = JSON.parse(fn.arguments);
      logger.info({ instanceId: state.instanceId, tool: fn.name, input: args }, 'Executing tool');
      const result = await executeTool(fn.name, args, state.instanceId, state.contactJid);
      state.openaiMessages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: result,
      });
    }
  }
}

// ============================================
// Message Processing
// ============================================

const MAX_TOOL_ROUNDS = 10;

export async function processMessage(
  instanceId: string,
  message: string,
  deps: SessionDependencies = defaultDeps,
): Promise<void> {
  let state = sessions.get(instanceId);

  if (!state) {
    const instance = await deps.getInstanceById(instanceId);
    if (!instance) throw new Error(`Instance not found: ${instanceId}`);
    state = await createSession(instance, deps);
  }

  logger.info({ instanceId, provider: state.provider, message: message.substring(0, 100) }, 'Processing message');

  const startTime = Date.now();

  try {
    if (state.provider === 'anthropic') {
      state.anthropicMessages.push({ role: 'user', content: message });
      await runAnthropicLoop(state);
    } else {
      state.openaiMessages.push({ role: 'user', content: message });
      await runOpenAILoop(state);
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Unknown error';
    logger.error({ instanceId, error: errMsg }, 'LLM API error');

    if (errMsg.includes('401') || errMsg.includes('authentication') || errMsg.includes('invalid')) {
      await deps.transition(instanceId, 'request_intervention');
    } else if (errMsg.includes('429') || errMsg.includes('rate')) {
      await deps.transition(instanceId, 'request_intervention');
    } else {
      const failResult = await deps.transition(instanceId, 'unrecoverable_error');
      if (!failResult.success) {
        await deps.transition(instanceId, 'request_intervention');
      }
    }
    return;
  }

  // Only trigger agent_processes_reply if in WAITING_FOR_AGENT state
  const currentInstance = await deps.getInstanceById(instanceId);
  if (currentInstance?.state === 'WAITING_FOR_AGENT') {
    const result = await deps.transition(instanceId, 'agent_processes_reply');
    if (!result.success) {
      logger.warn({ instanceId, error: result.error }, 'State transition failed after agent processed reply');
    }
  }

  const elapsed = Date.now() - startTime;
  logger.info({ instanceId, elapsedMs: elapsed }, 'Agent finished processing message');
}

// ============================================
// Session Lifecycle
// ============================================

export function destroySession(instanceId: string): void {
  if (sessions.delete(instanceId)) {
    logger.info({ instanceId }, 'Agent session destroyed');
  }
}

export function hasSession(instanceId: string): boolean {
  return sessions.has(instanceId);
}

export function getSessionCount(): number {
  return sessions.size;
}

export function destroyAllSessions(): void {
  const count = sessions.size;
  sessions.clear();
  logger.info({ count }, `Destroyed ${count} agent sessions during shutdown`);
}

export async function reconstructSession(
  instance: ConversationInstance,
  transcript: TranscriptMessage[],
  deps: SessionDependencies = defaultDeps,
): Promise<AgentSessionState> {
  destroySession(instance.id);
  logger.info({ instanceId: instance.id, transcriptLength: transcript.length }, 'Reconstructing agent session');
  return createSession(instance, deps);
}

export async function processWithAgent(
  instanceId: string,
  message: string,
  deps: SessionDependencies = defaultDeps,
): Promise<void> {
  return processMessage(instanceId, message, deps);
}
