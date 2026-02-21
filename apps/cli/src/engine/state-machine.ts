import type {
  ConversationInstance,
  InstanceState,
  StateEvent,
  StateTransition,
} from '../types.js';
import { VALID_TRANSITIONS } from '../types.js';
import * as InstanceStore from '../store/instances.js';
import logger from '../utils/logger.js';

// ============================================
// Terminal State Hooks
// ============================================

type TerminalHook = (instanceId: string) => void | Promise<void>;

const terminalHooks: TerminalHook[] = [];

/**
 * Registers a callback to be invoked when any instance reaches a terminal state
 * (COMPLETED, ABANDONED, FAILED). Used to wire cleanup and queue dequeue.
 */
export function onTerminalState(hook: TerminalHook): void {
  terminalHooks.push(hook);
}

// ============================================
// Terminal State Detection
// ============================================

const TERMINAL_STATES: ReadonlySet<InstanceState> = new Set<InstanceState>([
  'COMPLETED',
  'ABANDONED',
  'FAILED',
]);

/**
 * Returns true if the given state is terminal (no outgoing transitions).
 */
export function isTerminalState(state: InstanceState): boolean {
  return TERMINAL_STATES.has(state);
}

// ============================================
// Transition Feasibility
// ============================================

/**
 * Returns true if the given event is a valid transition from the given state.
 * For PAUSED + resume, the instance must have a non-null previous_state.
 */
export function canTransition(state: InstanceState, event: StateEvent): boolean {
  const stateTransitions = VALID_TRANSITIONS[state];
  if (!stateTransitions) {
    return false;
  }
  return event in stateTransitions;
}

/**
 * Returns the list of valid events for a given state.
 */
export function getValidTransitions(state: InstanceState): string[] {
  const stateTransitions = VALID_TRANSITIONS[state];
  if (!stateTransitions) {
    return [];
  }
  return Object.keys(stateTransitions);
}

// ============================================
// Transition Result
// ============================================

export type TransitionResult =
  | { success: true; from: InstanceState; to: InstanceState; instance: ConversationInstance }
  | { success: false; error: string };

// ============================================
// Core Transition Function
// ============================================

/**
 * Validates and executes a state transition for the given instance.
 *
 * - Looks up the instance from the store
 * - Validates the event against the transition table
 * - Handles PAUSED special case: stores previous_state on pause, restores on resume
 * - Handles cancel special case: sets failure_reason = "cancelled"
 * - Persists the new state via InstanceStore.update()
 * - Logs the transition
 * - Returns a TransitionResult
 */
export async function transition(
  instanceId: string,
  event: StateEvent,
): Promise<TransitionResult> {
  const instance = await InstanceStore.getById(instanceId);
  if (!instance) {
    const error = `Instance not found: ${instanceId}`;
    logger.error({ instanceId, event }, error);
    return { success: false, error };
  }

  const currentState = instance.state;

  // Terminal states have no outgoing transitions
  if (isTerminalState(currentState)) {
    const error = `Cannot transition from terminal state ${currentState} (instance: ${instanceId}, event: ${event})`;
    logger.warn({ instanceId, currentState, event }, error);
    return { success: false, error };
  }

  // Check if the event is valid for the current state
  if (!canTransition(currentState, event)) {
    const validEvents = getValidTransitions(currentState);
    const error = `Invalid transition: state=${currentState}, event=${event}, instance=${instanceId}. Valid events: [${validEvents.join(', ')}]`;
    logger.warn({ instanceId, currentState, event, validEvents }, error);
    return { success: false, error };
  }

  // Resolve the next state
  const stateTransitions = VALID_TRANSITIONS[currentState]!;
  let nextState = stateTransitions[event];

  // PAUSED + resume: nextState is null (dynamic), restore previous_state
  if (currentState === 'PAUSED' && event === 'resume') {
    if (!instance.previous_state) {
      const error = `Cannot resume PAUSED instance ${instanceId}: previous_state is null`;
      logger.error({ instanceId, currentState, event }, error);
      return { success: false, error };
    }
    nextState = instance.previous_state;
  }

  // Safety check: nextState must be resolved at this point
  if (nextState === null || nextState === undefined) {
    const error = `Failed to resolve next state for instance=${instanceId}, state=${currentState}, event=${event}`;
    logger.error({ instanceId, currentState, event }, error);
    return { success: false, error };
  }

  // Build the update payload
  const updateData: Partial<ConversationInstance> = {
    state: nextState,
  };

  // Special handling: pause stores previous_state
  if (event === 'pause') {
    updateData.previous_state = currentState;
  }

  // Special handling: resume clears previous_state
  if (event === 'resume') {
    updateData.previous_state = null;
  }

  // Special handling: cancel sets failure_reason
  if (event === 'cancel') {
    updateData.failure_reason = 'cancelled';
  }

  // Persist state change to store (must complete before side effects)
  const updatedInstance = await InstanceStore.update(instanceId, updateData);

  // Record the transition for logging
  const stateTransition: StateTransition = {
    instance_id: instanceId,
    from_state: currentState,
    to_state: nextState,
    trigger: event,
    timestamp: new Date().toISOString(),
  };

  logger.info(
    { transition: stateTransition },
    `State transition: ${currentState} -> ${nextState} (event: ${event}, instance: ${instanceId})`,
  );

  // Fire terminal state hooks if the instance reached a terminal state
  if (isTerminalState(nextState)) {
    for (const hook of terminalHooks) {
      try {
        await hook(instanceId);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Unknown error';
        logger.error(
          { instanceId, error: errMsg },
          'Terminal state hook failed',
        );
      }
    }
  }

  return {
    success: true,
    from: currentState,
    to: nextState,
    instance: updatedInstance,
  };
}
