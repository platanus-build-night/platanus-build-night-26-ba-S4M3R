import type { IncomingMessage } from './connection.js';
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

export interface MessageHandlerDeps {
  instanceStore: typeof InstanceStore;
  transcriptStore: typeof TranscriptStore;
  stateMachine: { transition: typeof transition };
  processWithAgent: typeof processWithAgent;
  heartbeat: {
    cancelHeartbeat: typeof cancelHeartbeat;
    scheduleHeartbeat: typeof scheduleHeartbeat;
  };
}

// ---------------------------------------------------------------------------
// Default dependencies (use real implementations)
// ---------------------------------------------------------------------------

const defaultDeps: MessageHandlerDeps = {
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
 * Creates a message handler callback to register with WhatsApp `onMessage`.
 *
 * The handler routes incoming WhatsApp messages to the correct conversation
 * instance based on the sender's phone number. It follows the outbound-first
 * model: messages from contacts with no active instance are ignored.
 *
 * @param deps - Injectable dependencies for testability
 * @returns Callback function compatible with `onMessage()`
 */
export function createMessageHandler(
  deps: MessageHandlerDeps = defaultDeps,
): (message: IncomingMessage) => void {
  return (message: IncomingMessage): void => {
    void handleIncomingMessage(message, deps);
  };
}

// ---------------------------------------------------------------------------
// Core message routing logic
// ---------------------------------------------------------------------------

async function handleIncomingMessage(
  message: IncomingMessage,
  deps: MessageHandlerDeps,
): Promise<void> {
  const { senderPhone, senderJid, text } = message;

  // Filter out group messages (group JIDs contain @g.us)
  if (senderJid.includes('@g.us')) {
    logger.debug({ senderJid }, 'Ignoring group message');
    return;
  }

  // Normalize phone number to international format with + prefix
  const phone = senderPhone.startsWith('+') ? senderPhone : `+${senderPhone}`;

  // Look up active instance for this contact
  const instance = await deps.instanceStore.getActiveForContact(phone);

  if (!instance) {
    logger.debug(
      { phone },
      `No active instance for contact ${phone}, ignoring message`,
    );
    return;
  }

  // Append the incoming message to the transcript
  await deps.transcriptStore.append({
    instance_id: instance.id,
    role: 'contact',
    content: text,
    timestamp: message.timestamp,
  });

  // If instance is in WAITING_FOR_REPLY, trigger the contact_replies transition
  if (instance.state === 'WAITING_FOR_REPLY') {
    const result = await deps.stateMachine.transition(
      instance.id,
      'contact_replies' as StateEvent,
    );

    if (result.success) {
      logger.info(
        { instanceId: instance.id, phone },
        `Incoming message routed to instance ${instance.id}`,
      );

      // Cancel existing heartbeat while agent processes
      deps.heartbeat.cancelHeartbeat(instance.id);

      // Let the agent process the incoming message
      try {
        await deps.processWithAgent(instance.id, text);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Unknown error';
        logger.error(
          { instanceId: instance.id, error: errMsg },
          'Agent failed to process incoming message; instance remains in current state',
        );
        // Agent error handling (NEEDS_HUMAN_INTERVENTION transition) is done
        // inside processWithAgent/processMessage. If we reach here, the error
        // was already handled or the instance state was already updated.
      }

      // Schedule a new heartbeat (agent may have sent a response, now waiting for reply)
      deps.heartbeat.scheduleHeartbeat(
        instance.id,
        instance.heartbeat_config.interval_ms,
      );
    } else {
      logger.warn(
        { instanceId: instance.id, error: result.error },
        'Failed to transition instance on contact reply',
      );
    }
  } else {
    // Instance exists but is in a state other than WAITING_FOR_REPLY.
    // Message is recorded in transcript but no state transition is triggered.
    logger.debug(
      { instanceId: instance.id, state: instance.state, phone },
      `Incoming message recorded for instance ${instance.id} (state: ${instance.state}, no transition)`,
    );
  }
}

