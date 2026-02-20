import type { IncomingMessage } from './connection.js';
import * as InstanceStore from '../store/instances.js';
import * as TranscriptStore from '../store/transcripts.js';
import { transition } from '../engine/state-machine.js';
import type { StateEvent } from '../types.js';
import logger from '../utils/logger.js';

// ---------------------------------------------------------------------------
// Dependencies interface for testability
// ---------------------------------------------------------------------------

export interface MessageHandlerDeps {
  instanceStore: typeof InstanceStore;
  transcriptStore: typeof TranscriptStore;
  stateMachine: { transition: typeof transition };
}

// ---------------------------------------------------------------------------
// Default dependencies (use real implementations)
// ---------------------------------------------------------------------------

const defaultDeps: MessageHandlerDeps = {
  instanceStore: InstanceStore,
  transcriptStore: TranscriptStore,
  stateMachine: { transition },
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
      // Agent processing placeholder -- will be wired in Phase 3
      void processAgentResponse(instance.id);
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

// ---------------------------------------------------------------------------
// Agent response placeholder (Phase 3)
// ---------------------------------------------------------------------------

/**
 * Placeholder for agent processing that will be called when a contact replies.
 *
 * In Phase 3, this will invoke the pi-mono agent session to process the
 * incoming message and generate a response.
 *
 * @param instanceId - The conversation instance to process
 */
export async function processAgentResponse(instanceId: string): Promise<void> {
  logger.debug(
    { instanceId },
    'processAgentResponse placeholder called -- agent wiring pending (Phase 3)',
  );
}
