import { getModel } from '@mariozechner/pi-ai';
import {
  createAgentSession as piCreateAgentSession,
  AuthStorage,
  ModelRegistry,
  SessionManager,
  SettingsManager,
  createExtensionRuntime,
  type AgentSession,
  type ResourceLoader,
} from '@mariozechner/pi-coding-agent';
import type { ConversationInstance, StateEvent, TranscriptMessage } from '../types.js';
import { createConversationTools } from './tools.js';
import * as InstanceStore from '../store/instances.js';
import * as TranscriptStore from '../store/transcripts.js';
import * as ConfigStore from '../store/config.js';
import { transition } from '../engine/state-machine.js';
import logger from '../utils/logger.js';

// ============================================
// Session Dependencies (for DI / testability)
// ============================================

/**
 * External dependencies injected into the session factory.
 * Defaults are provided for production use; override for testing.
 */
export interface SessionDependencies {
  getInstanceById: (id: string) => Promise<ConversationInstance | null>;
  getTranscriptByInstance: (instanceId: string) => Promise<TranscriptMessage[]>;
  getConfig: () => Promise<{ model_api_key: string | null; model_provider: string | null }>;
  transition: (instanceId: string, event: StateEvent) => Promise<{ success: boolean; error?: string }>;
}

const defaultDeps: SessionDependencies = {
  getInstanceById: InstanceStore.getById,
  getTranscriptByInstance: TranscriptStore.getByInstance,
  getConfig: ConfigStore.getConfig,
  transition,
};

// ============================================
// Session Map
// ============================================

const sessions = new Map<string, AgentSession>();

// ============================================
// System Prompt Builder
// ============================================

/**
 * Builds the agent system prompt from the conversation instance context.
 * Includes the objective, todo list with statuses, and behavioral rules.
 */
export function buildSystemPrompt(instance: ConversationInstance): string {
  const todosFormatted = instance.todos
    .map((todo) => `- [${todo.status}] ${todo.text} (id: ${todo.id})`)
    .join('\n');

  return `You are a conversation agent executing a specific objective via WhatsApp.

OBJECTIVE: ${instance.objective}

TODO LIST:
${todosFormatted || '(no todo items)'}

RULES:
- Only discuss topics related to the objective
- Never reveal you are an AI agent unless asked directly
- Be professional and concise
- Use the provided tools to manage the conversation
- Use send_message to send messages to the contact
- Use mark_todo_item to update todo statuses when information is gathered
- Mark todo items as completed when the information is gathered
- Use end_conversation when all todos are complete or the objective is fulfilled
- If you cannot proceed, use request_human_intervention
- Do NOT use any filesystem, code execution, or shell tools -- you only have conversation tools`;
}

// ============================================
// Message Builder
// ============================================

/**
 * Converts transcript messages into a single context string for the agent.
 * The agent receives this as part of a prompt, not as separate LLM messages,
 * because pi-mono manages its own message history internally.
 */
export function buildTranscriptContext(transcript: TranscriptMessage[]): string {
  if (transcript.length === 0) {
    return '';
  }

  const lines = transcript.map((msg) => {
    const roleLabel = msg.role === 'agent' ? 'You' : msg.role === 'contact' ? 'Contact' : msg.role;
    return `[${roleLabel}]: ${msg.content}`;
  });

  return `\nCONVERSATION HISTORY:\n${lines.join('\n')}`;
}

// ============================================
// Session Factory
// ============================================

/**
 * Resolves the pi-ai model identifier from the config provider string.
 * Maps config values like "anthropic" or "openai" to a concrete model.
 */
function resolveModel(provider: string | null, apiKey: string | null) {
  const resolvedProvider = provider ?? 'anthropic';

  if (resolvedProvider === 'anthropic') {
    return getModel('anthropic', 'claude-sonnet-4-20250514');
  }

  if (resolvedProvider === 'openai') {
    return getModel('openai', 'gpt-4o');
  }

  // Fallback to anthropic for unknown providers
  logger.warn({ provider: resolvedProvider }, 'Unknown model provider, falling back to anthropic');
  return getModel('anthropic', 'claude-sonnet-4-20250514');
}

/**
 * Creates a pi-mono agent session for the given conversation instance.
 *
 * The session is scoped to the instance: it receives only conversation tools
 * (no filesystem/code tools), and its system prompt includes the objective,
 * todo list, and transcript history.
 */
export async function createSession(
  instance: ConversationInstance,
  deps: SessionDependencies = defaultDeps,
): Promise<AgentSession> {
  const config = await deps.getConfig();
  const transcript = await deps.getTranscriptByInstance(instance.id);

  const systemPrompt = buildSystemPrompt(instance);
  const transcriptContext = buildTranscriptContext(transcript);
  const fullPrompt = transcriptContext
    ? `${systemPrompt}\n${transcriptContext}`
    : systemPrompt;

  // Build conversation-scoped tools (no fs/code/bash tools)
  const contactJid = `${instance.target_contact.replace('+', '')}@s.whatsapp.net`;
  const conversationTools = createConversationTools({
    instanceId: instance.id,
    contactJid,
  });

  // Configure auth: pi-mono reads API keys from environment variables.
  // Set them before creating the session so the SDK picks them up.
  const resolvedProvider = config.model_provider ?? 'anthropic';
  if (config.model_api_key) {
    if (resolvedProvider === 'anthropic') {
      process.env.ANTHROPIC_API_KEY = config.model_api_key;
    } else if (resolvedProvider === 'openai') {
      process.env.OPENAI_API_KEY = config.model_api_key;
    }
  }

  const authStorage = AuthStorage.create('/tmp/relay-agent/auth.json');

  const modelRegistry = new ModelRegistry(authStorage);
  const model = resolveModel(config.model_provider, config.model_api_key);

  // Minimal resource loader with our custom system prompt (no default coding prompts)
  const resourceLoader: ResourceLoader = {
    getExtensions: () => ({ extensions: [], errors: [], runtime: createExtensionRuntime() }),
    getSkills: () => ({ skills: [], diagnostics: [] }),
    getPrompts: () => ({ prompts: [], diagnostics: [] }),
    getThemes: () => ({ themes: [], diagnostics: [] }),
    getAgentsFiles: () => ({ agentsFiles: [] }),
    getSystemPrompt: () => fullPrompt,
    getAppendSystemPrompt: () => [],
    getPathMetadata: () => new Map(),
    extendResources: () => {},
    reload: async () => {},
  };

  const settingsManager = SettingsManager.inMemory({
    compaction: { enabled: false },
    retry: { enabled: true, maxRetries: 2 },
  });

  const { session } = await piCreateAgentSession({
    model,
    authStorage,
    modelRegistry,
    resourceLoader,
    tools: [], // No built-in coding tools
    customTools: conversationTools,
    sessionManager: SessionManager.inMemory(),
    settingsManager,
    thinkingLevel: 'off',
  });

  sessions.set(instance.id, session);

  logger.info(
    { instanceId: instance.id, toolCount: conversationTools.length },
    'Agent session created',
  );

  return session;
}

// ============================================
// Message Processing
// ============================================

/**
 * Processes an incoming message through the agent session.
 *
 * Retrieves (or creates) the session for the given instance, feeds the
 * incoming message to the agent via `session.prompt()`, and triggers
 * the `agent_processes_reply` state transition afterward.
 */
export async function processMessage(
  instanceId: string,
  message: string,
  deps: SessionDependencies = defaultDeps,
): Promise<void> {
  let session = sessions.get(instanceId);

  if (!session) {
    const instance = await deps.getInstanceById(instanceId);
    if (!instance) {
      throw new Error(`Instance not found: ${instanceId}`);
    }
    session = await createSession(instance, deps);
  }

  logger.debug(
    { instanceId, messageLength: message.length },
    'Processing message through agent session',
  );

  // Feed the message to the pi-mono agent. It will invoke tools as needed
  // (send_message, mark_todo_item, etc.) internally.
  try {
    await session.prompt(`Contact says: ${message}`);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Unknown error';
    const isTimeout = errMsg.toLowerCase().includes('timeout') || errMsg.toLowerCase().includes('timed out');
    const isRateLimit = errMsg.toLowerCase().includes('rate limit') || errMsg.toLowerCase().includes('429');
    const isAuthFailure = errMsg.toLowerCase().includes('401') || errMsg.toLowerCase().includes('unauthorized') || errMsg.toLowerCase().includes('invalid api key');

    if (isTimeout) {
      logger.warn({ instanceId, error: errMsg }, 'Agent LLM timeout, retrying once');
      try {
        await session.prompt(`Contact says: ${message}`);
      } catch (retryErr) {
        const retryMsg = retryErr instanceof Error ? retryErr.message : 'Unknown error';
        logger.error({ instanceId, error: retryMsg }, 'Agent LLM retry failed, requesting human intervention');
        await deps.transition(instanceId, 'request_intervention');
        return;
      }
    } else if (isRateLimit) {
      logger.error({ instanceId, error: errMsg }, 'Agent LLM rate limited, requesting human intervention');
      await deps.transition(instanceId, 'request_intervention');
      return;
    } else if (isAuthFailure) {
      logger.error({ instanceId, error: errMsg }, 'Agent LLM auth failure, requesting human intervention');
      await deps.transition(instanceId, 'request_intervention');
      return;
    } else {
      logger.error({ instanceId, error: errMsg }, 'Agent LLM unrecoverable error');
      const failResult = await deps.transition(instanceId, 'unrecoverable_error');
      if (!failResult.success) {
        // If unrecoverable_error transition is not valid from current state, try request_intervention
        await deps.transition(instanceId, 'request_intervention');
      }
      return;
    }
  }

  // Trigger state transition: agent has processed the reply
  const result = await deps.transition(instanceId, 'agent_processes_reply');
  if (!result.success) {
    logger.warn(
      { instanceId, error: result.error },
      'State transition failed after agent processed reply',
    );
  }

  logger.debug({ instanceId }, 'Agent finished processing message');
}

// ============================================
// Session Lifecycle
// ============================================

/**
 * Destroys the agent session for the given instance, releasing resources.
 */
export function destroySession(instanceId: string): void {
  const session = sessions.get(instanceId);
  if (session) {
    sessions.delete(instanceId);
    logger.info({ instanceId }, 'Agent session destroyed');
  }
}

/**
 * Returns whether an active session exists for the given instance.
 */
export function hasSession(instanceId: string): boolean {
  return sessions.has(instanceId);
}

/**
 * Returns the number of active agent sessions.
 */
export function getSessionCount(): number {
  return sessions.size;
}

/**
 * Destroys all active agent sessions. Used during daemon shutdown.
 */
export function destroyAllSessions(): void {
  const count = sessions.size;
  for (const instanceId of sessions.keys()) {
    logger.info({ instanceId }, 'Agent session destroyed (shutdown)');
  }
  sessions.clear();
  logger.info({ count }, `Destroyed ${count} agent sessions during shutdown`);
}

// ============================================
// Session Reconstruction (daemon restart)
// ============================================

/**
 * Reconstructs a session from a previous instance and its full transcript.
 *
 * Used after daemon restart to rebuild agent context. The transcript is
 * injected into the system prompt so the agent has full conversation history.
 *
 * Note: This is a best-effort reconstruction. The pi-mono session itself
 * is new, but the system prompt contains the full transcript for context.
 */
export async function reconstructSession(
  instance: ConversationInstance,
  transcript: TranscriptMessage[],
  deps: SessionDependencies = defaultDeps,
): Promise<AgentSession> {
  // Destroy any existing session first
  destroySession(instance.id);

  logger.info(
    { instanceId: instance.id, transcriptLength: transcript.length },
    'Reconstructing agent session from transcript',
  );

  // createSession already loads transcript from the store, but for
  // reconstruction we may want to pass explicit transcript. Since
  // createSession reads from store (which should have the data),
  // this works correctly.
  return createSession(instance, deps);
}

// ============================================
// Export for processWithAgent (task requirement)
// ============================================

/**
 * Main entry point: processes an incoming contact message through the agent.
 *
 * Loads the instance, feeds the message to the pi-mono agent session,
 * executes resulting tool calls, and triggers the appropriate state transition.
 */
export async function processWithAgent(
  instanceId: string,
  message: string,
  deps: SessionDependencies = defaultDeps,
): Promise<void> {
  return processMessage(instanceId, message, deps);
}
