import { Type, type Static } from '@sinclair/typebox';
import type { ToolDefinition, AgentToolResult, AgentToolUpdateCallback, ExtensionContext } from '@mariozechner/pi-coding-agent';
import * as WhatsApp from '../whatsapp/connection.js';
import * as TranscriptStore from '../store/transcripts.js';
import * as InstanceStore from '../store/instances.js';
import { transition } from '../engine/state-machine.js';
import logger from '../utils/logger.js';

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

const PlaceCallParams = Type.Object({});

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

      await WhatsApp.sendMessage(ctx.contactJid, text);

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
const heartbeatOverrides = new Map<string, number>();

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

function createPlaceCallTool(_ctx: ToolContext): ToolDefinition {
  return {
    name: 'place_call',
    label: 'Place Call',
    description: 'Place a voice call to the contact. NOT AVAILABLE in v1 -- this tool is a stub.',
    parameters: PlaceCallParams,
    async execute(
      _toolCallId: string,
      _params: Static<typeof PlaceCallParams>,
      _signal: AbortSignal | undefined,
      _onUpdate: AgentToolUpdateCallback | undefined,
      _extCtx: ExtensionContext,
    ): Promise<AgentToolResult<unknown>> {
      logger.info('place_call tool invoked but is not available in v1');

      return textResult(
        JSON.stringify({
          success: false,
          message: 'Feature not yet available. Voice calls are planned for a future release.',
        }),
        undefined,
      );
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
  ];
}
