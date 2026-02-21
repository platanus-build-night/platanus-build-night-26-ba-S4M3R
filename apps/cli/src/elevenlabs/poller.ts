import { getConversation } from './client.js';
import type { ConversationStatus } from './client.js';
import * as InstanceStore from '../store/instances.js';
import * as TranscriptStore from '../store/transcripts.js';
import { transition } from '../engine/state-machine.js';
import logger from '../utils/logger.js';

// ============================================
// Poller State
// ============================================

interface PollEntry {
  instanceId: string;
  conversationId: string;
  apiKey: string;
  timer: NodeJS.Timeout;
}

const activePollers = new Map<string, PollEntry>();

const POLL_INTERVAL_MS = 5_000; // 5 seconds

// ============================================
// Public API
// ============================================

/**
 * Starts polling an ElevenLabs conversation for status updates.
 * When the call ends (status "done" or "failed"), it:
 * - Fetches the transcript and stores it
 * - Transitions the instance to COMPLETED or FAILED
 * - Stops polling
 */
export function startPolling(instanceId: string, conversationId: string, apiKey: string): void {
  stopPolling(instanceId);

  const timer = setInterval(() => {
    void pollOnce(instanceId);
  }, POLL_INTERVAL_MS);

  activePollers.set(instanceId, { instanceId, conversationId, apiKey, timer });
  logger.info({ instanceId, conversationId }, 'Started polling ElevenLabs conversation');
}

export function stopPolling(instanceId: string): void {
  const entry = activePollers.get(instanceId);
  if (entry) {
    clearInterval(entry.timer);
    activePollers.delete(instanceId);
    logger.debug({ instanceId }, 'Stopped polling ElevenLabs conversation');
  }
}

export function stopAllPolling(): void {
  for (const [instanceId, entry] of activePollers) {
    clearInterval(entry.timer);
    logger.debug({ instanceId }, 'Stopped poller (shutdown)');
  }
  const count = activePollers.size;
  activePollers.clear();
  logger.info({ count }, `Stopped ${count} ElevenLabs pollers during shutdown`);
}

export function getActivePollerCount(): number {
  return activePollers.size;
}

/**
 * Reconstruct pollers for phone instances that are still ACTIVE on daemon restart.
 */
export async function reconstructPollers(): Promise<void> {
  const allInstances = await InstanceStore.getAll();
  const phoneActive = allInstances.filter(
    (inst) => inst.channel === 'phone' && inst.elevenlabs_data && inst.state === 'ACTIVE',
  );

  for (const inst of phoneActive) {
    // We need the API key — check env since we can't store it in the instance
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      logger.warn({ instanceId: inst.id }, 'Cannot reconstruct poller: ELEVENLABS_API_KEY not set');
      continue;
    }
    startPolling(inst.id, inst.elevenlabs_data!.conversation_id, apiKey);
  }

  logger.info({ count: phoneActive.length }, `Reconstructed ${phoneActive.length} ElevenLabs pollers`);
}

// ============================================
// Internal
// ============================================

const TERMINAL_STATUSES: Set<ConversationStatus> = new Set(['done', 'failed']);

async function pollOnce(instanceId: string): Promise<void> {
  const entry = activePollers.get(instanceId);
  if (!entry) return;

  try {
    const conv = await getConversation(entry.apiKey, entry.conversationId);

    logger.debug(
      { instanceId, conversationId: entry.conversationId, status: conv.status },
      'Polled ElevenLabs conversation',
    );

    if (!TERMINAL_STATUSES.has(conv.status)) return;

    // Call ended — store transcript
    if (conv.transcript && conv.transcript.length > 0) {
      for (const entry of conv.transcript) {
        if (!entry.message) continue;
        await TranscriptStore.append({
          instance_id: instanceId,
          role: entry.role === 'agent' ? 'agent' : 'contact',
          content: entry.message,
          timestamp: new Date().toISOString(),
        });
      }
      logger.info(
        { instanceId, messageCount: conv.transcript.length },
        'Stored ElevenLabs call transcript',
      );
    }

    // Transition instance
    if (conv.status === 'done') {
      await transition(instanceId, 'end_conversation');
      logger.info({ instanceId }, 'Phone call completed — instance marked COMPLETED');
    } else {
      await transition(instanceId, 'unrecoverable_error');
      await InstanceStore.update(instanceId, { failure_reason: 'ElevenLabs call failed' });
      logger.error({ instanceId }, 'Phone call failed — instance marked FAILED');
    }

    stopPolling(instanceId);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error({ instanceId, error: message }, 'Error polling ElevenLabs conversation');
  }
}
