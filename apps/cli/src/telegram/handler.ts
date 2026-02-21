import type { TelegramIncomingMessage } from './connection.js';
import { registerChatMapping } from './connection.js';
import * as InstanceStore from '../store/instances.js';
import * as TranscriptStore from '../store/transcripts.js';
import { transition } from '../engine/state-machine.js';
import { processWithAgent } from '../agent/session.js';
import { cancelHeartbeat, scheduleHeartbeat } from '../engine/heartbeat.js';
import type { StateEvent } from '../types.js';
import logger from '../utils/logger.js';

// ---------------------------------------------------------------------------
// Dependencies interface for testability
// ---------------------------------------------------------------------------

export interface TelegramHandlerDeps {
  instanceStore: typeof InstanceStore;
  transcriptStore: typeof TranscriptStore;
  stateMachine: { transition: typeof transition };
  processWithAgent: typeof processWithAgent;
  heartbeat: {
    cancelHeartbeat: typeof cancelHeartbeat;
    scheduleHeartbeat: typeof scheduleHeartbeat;
  };
}

const defaultDeps: TelegramHandlerDeps = {
  instanceStore: InstanceStore,
  transcriptStore: TranscriptStore,
  stateMachine: { transition },
  processWithAgent,
  heartbeat: {
    cancelHeartbeat,
    scheduleHeartbeat,
  },
};

// ---------------------------------------------------------------------------
// Message Handler Factory
// ---------------------------------------------------------------------------

/**
 * Creates a message handler callback to register with Telegram `onMessage`.
 *
 * Routes incoming Telegram messages to the correct conversation instance
 * based on the sender's phone number or chat ID.
 */
export function createTelegramMessageHandler(
  deps: TelegramHandlerDeps = defaultDeps,
): (message: TelegramIncomingMessage) => void {
  return (message: TelegramIncomingMessage): void => {
    void handleIncomingMessage(message, deps);
  };
}

// ---------------------------------------------------------------------------
// Core message routing logic
// ---------------------------------------------------------------------------

async function handleIncomingMessage(
  message: TelegramIncomingMessage,
  deps: TelegramHandlerDeps,
): Promise<void> {
  const { senderPhone, chatId, text } = message;

  // Normalize phone number to international format with + prefix
  const phone = senderPhone.startsWith('+') ? senderPhone : `+${senderPhone}`;

  // Look up active instance for this contact
  // Try by phone number first, then by chat ID as the contact identifier
  let instance = await deps.instanceStore.getActiveForContact(phone);

  // If no match by phone, check if any telegram instance uses this chat ID
  if (!instance) {
    const allInstances = await deps.instanceStore.getAll();
    instance = allInstances.find(
      (inst) =>
        inst.channel === 'telegram' &&
        inst.telegram_chat_id === chatId &&
        !['COMPLETED', 'ABANDONED', 'FAILED'].includes(inst.state) &&
        inst.state !== 'QUEUED',
    ) ?? null;
  }

  if (!instance) {
    logger.info(
      { phone, chatId },
      `No active Telegram instance for contact ${phone} (chat ${chatId}), ignoring message`,
    );
    return;
  }

  // Map this chat ID to the instance's target_contact for future lookups
  registerChatMapping(instance.target_contact, chatId);

  // If instance doesn't have a chat ID stored yet, save it
  if (!instance.telegram_chat_id) {
    await deps.instanceStore.update(instance.id, { telegram_chat_id: chatId } as Partial<typeof instance>);
  }

  // Append the incoming message to the transcript
  await deps.transcriptStore.append({
    instance_id: instance.id,
    role: 'contact',
    content: text,
    timestamp: message.timestamp,
  });

  // Route message if instance can accept contact replies
  if (instance.state === 'WAITING_FOR_REPLY' || instance.state === 'ACTIVE') {
    const result = await deps.stateMachine.transition(
      instance.id,
      'contact_replies' as StateEvent,
    );

    if (result.success) {
      logger.info(
        { instanceId: instance.id, phone, chatId },
        `Incoming Telegram message routed to instance ${instance.id}`,
      );

      deps.heartbeat.cancelHeartbeat(instance.id);

      try {
        await deps.processWithAgent(instance.id, text);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Unknown error';
        logger.error(
          { instanceId: instance.id, error: errMsg },
          'Agent failed to process incoming Telegram message',
        );
      }

      deps.heartbeat.scheduleHeartbeat(
        instance.id,
        instance.heartbeat_config.interval_ms,
      );
    } else {
      logger.warn(
        { instanceId: instance.id, error: result.error },
        'Failed to transition instance on Telegram contact reply',
      );
    }
  } else {
    logger.debug(
      { instanceId: instance.id, state: instance.state, phone, chatId },
      `Incoming Telegram message recorded for instance ${instance.id} (state: ${instance.state}, no transition)`,
    );
  }
}
