import type { ConversationInstance, InstanceState } from '../types.js';
import * as InstanceStore from '../store/instances.js';
import { transition } from './state-machine.js';
import { processWithAgent } from '../agent/session.js';
import { consumeHeartbeatOverride } from '../agent/tools.js';
import logger from '../utils/logger.js';

// ============================================
// Timer Storage
// ============================================

const activeTimers = new Map<string, NodeJS.Timeout>();

// ============================================
// Schedule Heartbeat
// ============================================

/**
 * Schedules a heartbeat timer for the given instance.
 * Cancels any existing timer before scheduling a new one.
 *
 * @param instanceId - The conversation instance ID
 * @param delayMs - Delay in milliseconds before the heartbeat fires
 */
export function scheduleHeartbeat(instanceId: string, delayMs: number): void {
  cancelHeartbeat(instanceId);

  const timer = setTimeout(() => {
    activeTimers.delete(instanceId);
    void onHeartbeatFire(instanceId);
  }, delayMs);

  activeTimers.set(instanceId, timer);

  logger.debug(
    { instanceId, delayMs },
    `Heartbeat scheduled for instance ${instanceId} in ${delayMs}ms`,
  );
}

// ============================================
// Cancel Heartbeat
// ============================================

/**
 * Cancels an active heartbeat timer for the given instance.
 */
export function cancelHeartbeat(instanceId: string): void {
  const timer = activeTimers.get(instanceId);
  if (timer) {
    clearTimeout(timer);
    activeTimers.delete(instanceId);
    logger.debug(
      { instanceId },
      `Heartbeat cancelled for instance ${instanceId}`,
    );
  }
}

// ============================================
// Heartbeat Fire Handler
// ============================================

/**
 * Handles a heartbeat timer firing for the given instance.
 *
 * Checks the instance state and follow-up count:
 * - If under max_followups: transitions to HEARTBEAT_SCHEDULED, invokes agent
 *   for follow-up, transitions back to WAITING_FOR_REPLY, increments count,
 *   and schedules the next heartbeat.
 * - If at/over max_followups: transitions to ABANDONED.
 */
async function onHeartbeatFire(instanceId: string): Promise<void> {
  const instance = await InstanceStore.getById(instanceId);
  if (!instance) {
    logger.warn(
      { instanceId },
      `Heartbeat fired but instance ${instanceId} not found`,
    );
    return;
  }

  const validStates: ReadonlySet<InstanceState> = new Set<InstanceState>([
    'WAITING_FOR_REPLY',
    'HEARTBEAT_SCHEDULED',
  ]);

  if (!validStates.has(instance.state)) {
    logger.warn(
      { instanceId, state: instance.state },
      `Heartbeat fired but instance ${instanceId} is in state ${instance.state}, ignoring`,
    );
    return;
  }

  const { max_followups } = instance.heartbeat_config;

  if (instance.follow_up_count >= max_followups) {
    // At or over limit: transition to ABANDONED
    const transResult = await transition(instanceId, 'max_followups_exceeded');
    if (!transResult.success) {
      // Need heartbeat_fires first if in WAITING_FOR_REPLY
      const fireResult = await transition(instanceId, 'heartbeat_fires');
      if (fireResult.success) {
        await transition(instanceId, 'max_followups_exceeded');
      }
    }

    logger.info(
      { instanceId, followUpCount: instance.follow_up_count },
      `Instance ${instanceId} abandoned after ${instance.follow_up_count} follow-ups`,
    );
    return;
  }

  // Under limit: transition to HEARTBEAT_SCHEDULED, then follow up
  if (instance.state === 'WAITING_FOR_REPLY') {
    const fireResult = await transition(instanceId, 'heartbeat_fires');
    if (!fireResult.success) {
      logger.error(
        { instanceId, error: fireResult.error },
        'Failed to transition to HEARTBEAT_SCHEDULED on heartbeat fire',
      );
      return;
    }
  }

  // Invoke agent to generate and send follow-up message
  try {
    await processWithAgent(
      instanceId,
      'The contact has not replied. Please send a follow-up message.',
    );
  } catch (err) {
    logger.error(
      { instanceId, error: err },
      'Agent failed to process heartbeat follow-up',
    );
  }

  // Transition: followup_sent (HEARTBEAT_SCHEDULED -> WAITING_FOR_REPLY)
  const sentResult = await transition(instanceId, 'followup_sent');
  if (!sentResult.success) {
    logger.warn(
      { instanceId, error: sentResult.error },
      'State transition failed after follow-up sent',
    );
  }

  // Increment follow_up_count
  const newCount = instance.follow_up_count + 1;
  await InstanceStore.update(instanceId, { follow_up_count: newCount });

  // Schedule next heartbeat, checking for override from agent
  const override = consumeHeartbeatOverride(instanceId);
  const nextDelay = override ?? instance.heartbeat_config.interval_ms;

  scheduleHeartbeat(instanceId, nextDelay);

  logger.debug(
    { instanceId, followUpCount: newCount, nextDelayMs: nextDelay },
    `Heartbeat follow-up sent for instance ${instanceId}, count: ${newCount}`,
  );
}

// ============================================
// Suspend / Resume Support
// ============================================

/**
 * Suspends a heartbeat timer for the given instance without clearing state.
 * Used when an instance enters the PAUSED state.
 */
export function suspendHeartbeat(instanceId: string): void {
  const timer = activeTimers.get(instanceId);
  if (timer) {
    clearTimeout(timer);
    activeTimers.delete(instanceId);
    logger.debug(
      { instanceId },
      `Heartbeat suspended for instance ${instanceId}`,
    );
  }
}

/**
 * Resumes a heartbeat for the given instance using its configured interval.
 * Used when an instance exits the PAUSED state back to WAITING_FOR_REPLY
 * or HEARTBEAT_SCHEDULED.
 */
export async function resumeHeartbeat(instanceId: string): Promise<void> {
  const instance = await InstanceStore.getById(instanceId);
  if (!instance) {
    logger.warn(
      { instanceId },
      `Cannot resume heartbeat: instance ${instanceId} not found`,
    );
    return;
  }

  const delayMs = instance.heartbeat_config.interval_ms;
  scheduleHeartbeat(instanceId, delayMs);

  logger.debug(
    { instanceId, delayMs },
    `Heartbeat resumed for instance ${instanceId} with ${delayMs}ms delay`,
  );
}

// ============================================
// Cancel All Heartbeats (Shutdown)
// ============================================

/**
 * Cancels all active heartbeat timers. Used during daemon shutdown.
 */
export function cancelAllHeartbeats(): void {
  const count = activeTimers.size;
  for (const [instanceId, timer] of activeTimers) {
    clearTimeout(timer);
    logger.debug(
      { instanceId },
      `Heartbeat cancelled for instance ${instanceId} (shutdown)`,
    );
  }
  activeTimers.clear();

  logger.info(
    { count },
    `Cancelled ${count} heartbeat timers during shutdown`,
  );
}

// ============================================
// Reconstruct Timers (Daemon Restart)
// ============================================

/**
 * Reconstructs heartbeat timers for all instances in WAITING_FOR_REPLY
 * or HEARTBEAT_SCHEDULED state. Called on daemon restart.
 *
 * Since exact remaining time is lost on restart, the full interval
 * is used for each timer (acceptable per design doc).
 */
export async function reconstructTimers(): Promise<void> {
  const allInstances = await InstanceStore.getAll();

  const eligibleStates: ReadonlySet<InstanceState> = new Set<InstanceState>([
    'WAITING_FOR_REPLY',
    'HEARTBEAT_SCHEDULED',
  ]);

  const eligible = allInstances.filter((inst) => eligibleStates.has(inst.state));

  for (const instance of eligible) {
    const delayMs = instance.heartbeat_config.interval_ms;
    scheduleHeartbeat(instance.id, delayMs);
  }

  logger.info(
    { count: eligible.length },
    `Reconstructed ${eligible.length} heartbeat timers`,
  );
}

// ============================================
// Utility: Get Active Timer Count (for testing/diagnostics)
// ============================================

/**
 * Returns the number of currently active heartbeat timers.
 */
export function getActiveTimerCount(): number {
  return activeTimers.size;
}
