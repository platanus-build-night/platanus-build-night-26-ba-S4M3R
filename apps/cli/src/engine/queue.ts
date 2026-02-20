import type { ConversationInstance, InstanceState } from '../types.js';
import * as InstanceStore from '../store/instances.js';
import { transition } from './state-machine.js';
import logger from '../utils/logger.js';

/**
 * Queue Manager - FIFO Concurrency Queue Per Contact
 *
 * Enforces the invariant: at most one non-terminal, non-QUEUED instance
 * per contact at any time. New instances for a contact that already has
 * an active instance are transitioned to QUEUED state.
 */

/**
 * Determines whether a new instance should be queued or left as CREATED.
 *
 * - If the contact already has an active (non-terminal, non-QUEUED) instance,
 *   transitions the new instance to QUEUED and returns 'QUEUED'.
 * - Otherwise, leaves the instance in CREATED state and returns 'CREATED'.
 */
export async function enqueueOrActivate(
  instance: ConversationInstance,
): Promise<InstanceState> {
  const activeInstance = await InstanceStore.getActiveForContact(instance.target_contact);

  if (activeInstance && activeInstance.id !== instance.id) {
    const result = await transition(instance.id, 'contact_has_active_instance');
    if (!result.success) {
      logger.error(
        { instanceId: instance.id, contact: instance.target_contact, error: result.error },
        `Failed to queue instance: ${result.error}`,
      );
      throw new Error(`Failed to queue instance ${instance.id}: ${result.error}`);
    }

    logger.info(
      { instanceId: instance.id, contact: instance.target_contact, activeInstanceId: activeInstance.id },
      `Instance ${instance.id} queued behind active instance ${activeInstance.id} for contact ${instance.target_contact}`,
    );

    return 'QUEUED';
  }

  return 'CREATED';
}

/**
 * Called when an instance reaches a terminal state (COMPLETED, ABANDONED, FAILED).
 *
 * Checks for QUEUED instances for the same contact and dequeues the oldest
 * one (FIFO order by created_at), transitioning it from QUEUED to CREATED.
 */
export async function onInstanceTerminal(instanceId: string): Promise<void> {
  const instance = await InstanceStore.getById(instanceId);
  if (!instance) {
    logger.warn({ instanceId }, `onInstanceTerminal: instance not found: ${instanceId}`);
    return;
  }

  const queuedInstances = await getQueueForContact(instance.target_contact);
  if (queuedInstances.length === 0) {
    return;
  }

  const nextInstance = queuedInstances[0];
  const result = await transition(nextInstance.id, 'prior_instance_terminal');

  if (result.success) {
    logger.info(
      { instanceId: nextInstance.id, contact: instance.target_contact },
      `Dequeued instance ${nextInstance.id} for contact ${instance.target_contact}`,
    );
  } else {
    logger.error(
      { instanceId: nextInstance.id, contact: instance.target_contact, error: result.error },
      `Failed to dequeue instance ${nextInstance.id}: ${result.error}`,
    );
  }
}

/**
 * Returns an ordered list of QUEUED instances for a contact, sorted by
 * created_at ascending (oldest first -- FIFO order).
 */
export async function getQueueForContact(contact: string): Promise<ConversationInstance[]> {
  const allForContact = await InstanceStore.getByContact(contact);

  return allForContact
    .filter((inst) => inst.state === 'QUEUED')
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}
