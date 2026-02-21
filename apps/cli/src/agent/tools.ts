import { Type, type Static } from '@sinclair/typebox';
import type { ToolDefinition, AgentToolResult, AgentToolUpdateCallback, ExtensionContext } from '@mariozechner/pi-coding-agent';
import * as WhatsApp from '../whatsapp/connection.js';
import * as Telegram from '../telegram/connection.js';
import * as TranscriptStore from '../store/transcripts.js';
import * as InstanceStore from '../store/instances.js';
import * as ConfigStore from '../store/config.js';
import { transition } from '../engine/state-machine.js';
import { createAgentAndCall } from '../elevenlabs/client.js';
import logger from '../utils/logger.js';

async function getElevenLabsConfig(): Promise<{ apiKey: string | null; phoneNumberId: string | null }> {
  const apiKey = process.env.ELEVENLABS_API_KEY ?? null;
  const phoneNumberId = process.env.ELEVENLABS_PHONE_NUMBER_ID ?? null;
  if (apiKey && phoneNumberId) return { apiKey, phoneNumberId };
  try {
    const config = await ConfigStore.getConfig();
    return {
      apiKey: apiKey ?? config.elevenlabs_api_key,
      phoneNumberId: phoneNumberId ?? config.elevenlabs_phone_number_id,
    };
  } catch {
    return { apiKey, phoneNumberId };
  }
}

// ============================================
// Tool Context
// ============================================

/**
 * Context provided to each tool, scoping operations to a specific conversation instance.
 */
export interface ToolContext {
  /** The conversation instance ID */
  instanceId: string;
  /** WhatsApp JID of the contact (e.g., "56912345678@s.whatsapp.net") */
  contactJid: string;
}

// ============================================
// Parameter Schemas (TypeBox)
// ============================================

const SendMessageParams = Type.Object({
  text: Type.String({ description: 'The text message to send to the contact' }),
});

const MarkTodoItemParams = Type.Object({
  todo_id: Type.String({ description: 'The ID of the todo item to update' }),
  status: Type.Union(
    [
      Type.Literal('pending'),
      Type.Literal('in_progress'),
      Type.Literal('completed'),
      Type.Literal('skipped'),
    ],
    { description: 'The new status for the todo item' },
  ),
});

const EndConversationParams = Type.Object({
  reason: Type.String({ description: 'The reason for ending the conversation' }),
});

const RequestHumanInterventionParams = Type.Object({
  reason: Type.String({ description: 'The reason human intervention is needed' }),
});

const ScheduleNextHeartbeatParams = Type.Object({
  delay_ms: Type.Number({ description: 'Delay in milliseconds before the next heartbeat fires' }),
});

const PlaceCallParams = Type.Object({
  to_number: Type.String({ description: 'Phone number to call in E.164 format (e.g., "+16282276008")' }),
  prompt: Type.String({ description: 'System prompt for the voice agent' }),
  first_message: Type.String({ description: 'First message the agent says when the call connects' }),
});

const EscalateToCallParams = Type.Object({
  reason: Type.String({ description: 'Why you are escalating from WhatsApp to a phone call' }),
  extra_context: Type.Optional(Type.String({ description: 'Additional context or instructions for the voice agent beyond the conversation history' })),
  first_message: Type.String({ description: 'The first thing the voice agent should say when the contact picks up' }),
  language: Type.Optional(Type.String({ description: 'Language code (e.g., "en", "es"). Defaults to "en"' })),
});

// ============================================
// Helper: Build a text-only AgentToolResult
// ============================================

function textResult<T>(text: string, details: T): AgentToolResult<T> {
  return {
    content: [{ type: 'text', text }],
    details,
  };
}

// ============================================
// Tool Implementations
// ============================================

function createSendMessageTool(ctx: ToolContext): ToolDefinition {
  return {
    name: 'send_message',
    label: 'Send Message',
    description: 'Send a text message to the contact via WhatsApp. Records the message in the conversation transcript and transitions state to WAITING_FOR_REPLY.',
    parameters: SendMessageParams,
    async execute(
      _toolCallId: string,
      params: Static<typeof SendMessageParams>,
      _signal: AbortSignal | undefined,
      _onUpdate: AgentToolUpdateCallback | undefined,
      _extCtx: ExtensionContext,
    ): Promise<AgentToolResult<unknown>> {
      const { text } = params;

      // Route to correct channel
      const inst = await InstanceStore.getById(ctx.instanceId);
      if (inst?.channel === 'telegram') {
        const chatId = inst.telegram_chat_id ?? Telegram.getChatIdForPhone(inst.target_contact);
        if (!chatId) {
          return textResult(JSON.stringify({ success: false, error: 'No Telegram chat ID for this contact. The contact must message the bot first.' }), undefined);
        }
        await Telegram.sendMessage(chatId, text);
      } else {
        await WhatsApp.sendMessage(ctx.contactJid, text);
      }

      await TranscriptStore.append({
        instance_id: ctx.instanceId,
        role: 'agent',
        content: text,
        timestamp: new Date().toISOString(),
      });

      const result = await transition(ctx.instanceId, 'message_sent');
      if (!result.success) {
        logger.warn(
          { instanceId: ctx.instanceId, error: result.error },
          'State transition failed after send_message',
        );
      }

      logger.debug(
        { instanceId: ctx.instanceId, textLength: text.length },
        'Agent sent message via send_message tool',
      );

      return textResult(JSON.stringify({ success: true }), undefined);
    },
  };
}

function createMarkTodoItemTool(ctx: ToolContext): ToolDefinition {
  return {
    name: 'mark_todo_item',
    label: 'Mark Todo Item',
    description: 'Update the status of a todo item in the conversation instance. Valid statuses: pending, in_progress, completed, skipped.',
    parameters: MarkTodoItemParams,
    async execute(
      _toolCallId: string,
      params: Static<typeof MarkTodoItemParams>,
      _signal: AbortSignal | undefined,
      _onUpdate: AgentToolUpdateCallback | undefined,
      _extCtx: ExtensionContext,
    ): Promise<AgentToolResult<unknown>> {
      const { todo_id, status } = params;

      const instance = await InstanceStore.getById(ctx.instanceId);
      if (!instance) {
        const error = `Instance not found: ${ctx.instanceId}`;
        logger.error({ instanceId: ctx.instanceId }, error);
        return textResult(JSON.stringify({ success: false, error }), undefined);
      }

      const todo = instance.todos.find((t) => t.id === todo_id);
      if (!todo) {
        const error = `Todo item not found: ${todo_id}`;
        logger.warn({ instanceId: ctx.instanceId, todo_id }, error);
        return textResult(JSON.stringify({ success: false, error }), undefined);
      }

      todo.status = status;
      await InstanceStore.update(ctx.instanceId, { todos: instance.todos });

      logger.debug(
        { instanceId: ctx.instanceId, todo_id, new_status: status },
        'Agent updated todo item via mark_todo_item tool',
      );

      return textResult(
        JSON.stringify({ success: true, todo_id, new_status: status }),
        undefined,
      );
    },
  };
}

function createEndConversationTool(ctx: ToolContext): ToolDefinition {
  return {
    name: 'end_conversation',
    label: 'End Conversation',
    description: 'Mark the conversation as completed. Provide a reason for ending.',
    parameters: EndConversationParams,
    async execute(
      _toolCallId: string,
      params: Static<typeof EndConversationParams>,
      _signal: AbortSignal | undefined,
      _onUpdate: AgentToolUpdateCallback | undefined,
      _extCtx: ExtensionContext,
    ): Promise<AgentToolResult<unknown>> {
      const { reason } = params;

      const result = await transition(ctx.instanceId, 'end_conversation');
      if (!result.success) {
        logger.error(
          { instanceId: ctx.instanceId, error: result.error },
          'State transition failed for end_conversation',
        );
        return textResult(
          JSON.stringify({ success: false, error: result.error }),
          undefined,
        );
      }

      logger.info(
        { instanceId: ctx.instanceId, reason },
        'Conversation ended via end_conversation tool',
      );

      return textResult(JSON.stringify({ success: true, reason }), undefined);
    },
  };
}

function createRequestHumanInterventionTool(ctx: ToolContext): ToolDefinition {
  return {
    name: 'request_human_intervention',
    label: 'Request Human Intervention',
    description: 'Flag the conversation for human review. Transitions state to NEEDS_HUMAN_INTERVENTION.',
    parameters: RequestHumanInterventionParams,
    async execute(
      _toolCallId: string,
      params: Static<typeof RequestHumanInterventionParams>,
      _signal: AbortSignal | undefined,
      _onUpdate: AgentToolUpdateCallback | undefined,
      _extCtx: ExtensionContext,
    ): Promise<AgentToolResult<unknown>> {
      const { reason } = params;

      const result = await transition(ctx.instanceId, 'request_intervention');
      if (!result.success) {
        logger.error(
          { instanceId: ctx.instanceId, error: result.error },
          'State transition failed for request_human_intervention',
        );
        return textResult(
          JSON.stringify({ success: false, error: result.error }),
          undefined,
        );
      }

      logger.info(
        { instanceId: ctx.instanceId, reason },
        'Human intervention requested via request_human_intervention tool',
      );

      return textResult(JSON.stringify({ success: true, reason }), undefined);
    },
  };
}

/**
 * Heartbeat override delay storage.
 * Keyed by instance ID. The heartbeat system (Task 3.3) will read and clear this.
 */
export const heartbeatOverrides = new Map<string, number>();

/**
 * Read and clear the heartbeat override for an instance.
 * Called by the heartbeat manager when scheduling the next heartbeat.
 */
export function consumeHeartbeatOverride(instanceId: string): number | null {
  const override = heartbeatOverrides.get(instanceId);
  if (override !== undefined) {
    heartbeatOverrides.delete(instanceId);
    return override;
  }
  return null;
}

function createScheduleNextHeartbeatTool(ctx: ToolContext): ToolDefinition {
  return {
    name: 'schedule_next_heartbeat',
    label: 'Schedule Next Heartbeat',
    description: 'Override the delay before the next heartbeat fires. The heartbeat system will use this delay instead of the default interval.',
    parameters: ScheduleNextHeartbeatParams,
    async execute(
      _toolCallId: string,
      params: Static<typeof ScheduleNextHeartbeatParams>,
      _signal: AbortSignal | undefined,
      _onUpdate: AgentToolUpdateCallback | undefined,
      _extCtx: ExtensionContext,
    ): Promise<AgentToolResult<unknown>> {
      const { delay_ms } = params;

      heartbeatOverrides.set(ctx.instanceId, delay_ms);

      logger.debug(
        { instanceId: ctx.instanceId, delay_ms },
        'Heartbeat override scheduled via schedule_next_heartbeat tool',
      );

      return textResult(
        JSON.stringify({ success: true, delay_ms }),
        undefined,
      );
    },
  };
}

function createPlaceCallTool(ctx: ToolContext): ToolDefinition {
  return {
    name: 'place_call',
    label: 'Place Call',
    description: 'Place an outbound voice call via ElevenLabs. Creates a temporary voice agent with the given prompt, then calls the number. Requires ELEVENLABS_API_KEY and ELEVENLABS_PHONE_NUMBER_ID env vars.',
    parameters: PlaceCallParams,
    async execute(
      _toolCallId: string,
      params: Static<typeof PlaceCallParams>,
      _signal: AbortSignal | undefined,
      _onUpdate: AgentToolUpdateCallback | undefined,
      _extCtx: ExtensionContext,
    ): Promise<AgentToolResult<unknown>> {
      const { to_number, prompt, first_message } = params;

      const { apiKey, phoneNumberId } = await getElevenLabsConfig();
      if (!apiKey) {
        logger.error('place_call: ELEVENLABS_API_KEY not configured');
        return textResult(
          JSON.stringify({ success: false, error: 'ElevenLabs API key is not configured. Set ELEVENLABS_API_KEY env var or store it in config.' }),
          undefined,
        );
      }
      if (!phoneNumberId) {
        logger.error('place_call: ELEVENLABS_PHONE_NUMBER_ID not configured');
        return textResult(
          JSON.stringify({ success: false, error: 'ElevenLabs phone number ID is not configured. Set ELEVENLABS_PHONE_NUMBER_ID env var or store it in config.' }),
          undefined,
        );
      }

      try {
        const result = await createAgentAndCall(apiKey, {
          prompt,
          first_message,
          phone_number_id: phoneNumberId,
          to_number,
        });

        logger.info(
          { instanceId: ctx.instanceId, to_number, agent_id: result.agent_id, conversation_id: result.conversation_id },
          'Agent created and call placed via place_call tool',
        );

        return textResult(
          JSON.stringify({ success: true, agent_id: result.agent_id, conversation_id: result.conversation_id }),
          undefined,
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        logger.error({ instanceId: ctx.instanceId, to_number, error: message }, 'place_call failed');
        return textResult(
          JSON.stringify({ success: false, error: message }),
          undefined,
        );
      }
    },
  };
}

function createEscalateToCallTool(ctx: ToolContext): ToolDefinition {
  return {
    name: 'escalate_to_call',
    label: 'Escalate to Phone Call',
    description: 'Escalate the current WhatsApp conversation to a live phone call. Creates an ElevenLabs voice agent with the full conversation context and calls the contact. Requires ELEVENLABS_API_KEY and ELEVENLABS_PHONE_NUMBER_ID env vars.',
    parameters: EscalateToCallParams,
    async execute(
      _toolCallId: string,
      params: Static<typeof EscalateToCallParams>,
      _signal: AbortSignal | undefined,
      _onUpdate: AgentToolUpdateCallback | undefined,
      _extCtx: ExtensionContext,
    ): Promise<AgentToolResult<unknown>> {
      const { reason, extra_context, first_message, language } = params;

      const { apiKey, phoneNumberId } = await getElevenLabsConfig();
      if (!apiKey) {
        return textResult(JSON.stringify({ success: false, error: 'ElevenLabs API key is not configured. Set ELEVENLABS_API_KEY env var or store it in config.' }), undefined);
      }
      if (!phoneNumberId) {
        return textResult(JSON.stringify({ success: false, error: 'ElevenLabs phone number ID is not configured. Set ELEVENLABS_PHONE_NUMBER_ID env var or store it in config.' }), undefined);
      }

      try {
        const instance = await InstanceStore.getById(ctx.instanceId);
        if (!instance) {
          return textResult(JSON.stringify({ success: false, error: 'Instance not found' }), undefined);
        }

        const transcript = await TranscriptStore.getByInstance(ctx.instanceId);
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

        const result = await createAgentAndCall(apiKey, {
          prompt: voicePrompt,
          first_message,
          phone_number_id: phoneNumberId,
          to_number: instance.target_contact,
          language: language ?? 'en',
          agent_name: `relay-escalation-${ctx.instanceId.slice(0, 8)}`,
        });

        await InstanceStore.update(ctx.instanceId, {
          elevenlabs_data: {
            agent_id: result.agent_id,
            conversation_id: result.conversation_id,
            call_sid: result.callSid,
          },
        });

        logger.info(
          { instanceId: ctx.instanceId, agent_id: result.agent_id, conversation_id: result.conversation_id, reason },
          'Escalated WhatsApp conversation to phone call',
        );

        return textResult(
          JSON.stringify({ success: true, agent_id: result.agent_id, conversation_id: result.conversation_id }),
          undefined,
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        logger.error({ instanceId: ctx.instanceId, error: message }, 'escalate_to_call failed');
        return textResult(JSON.stringify({ success: false, error: message }), undefined);
      }
    },
  };
}

// ============================================
// Factory Function
// ============================================

/**
 * Creates the set of conversation-scoped tools for a pi-mono agent session.
 *
 * Each tool is bound to the given context (instance ID and contact JID),
 * ensuring all operations are scoped to the correct conversation.
 *
 * @param context - The conversation context to bind tools to
 * @returns Array of ToolDefinition objects compatible with pi-mono createAgentSession customTools
 */
export function createConversationTools(context: ToolContext): ToolDefinition[] {
  return [
    createSendMessageTool(context),
    createMarkTodoItemTool(context),
    createEndConversationTool(context),
    createRequestHumanInterventionTool(context),
    createScheduleNextHeartbeatTool(context),
    createPlaceCallTool(context),
    createEscalateToCallTool(context),
  ];
}
