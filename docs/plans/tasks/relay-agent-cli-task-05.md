# Task 1.5: State Machine Engine -- Transition Validation and State Persistence

Metadata:
- Dependencies: Task 1.4 (InstanceStore for state persistence)
- Provides: `apps/cli/src/engine/state-machine.ts`
- Size: Small (1 file)

## Implementation Content
Implement the 11-state conversation FSM with a declarative transition table, validated transitions, PAUSED/resume logic, and terminal state enforcement. This is the core domain logic -- all features trigger state transitions through this engine.

Reference: Design Doc "Full State Transition Table" and "System Invariants" sections.

## Target Files
- [x] `apps/cli/src/engine/state-machine.ts` (create)

## Implementation Steps

### 1. Define transition table as declarative data structure
- [x] Create a `Map<InstanceState, Map<string, InstanceState>>` mapping `currentState -> event -> nextState`
- [x] Implement all 30+ transitions from the Design Doc transition table:
  - CREATED: `agent_sends_first_message` -> ACTIVE, `contact_has_active_instance` -> QUEUED, `pause` -> PAUSED, `cancel` -> FAILED
  - QUEUED: `prior_instance_terminal` -> CREATED, `pause` -> PAUSED, `cancel` -> FAILED
  - ACTIVE: `message_sent` -> WAITING_FOR_REPLY, `end_conversation` -> COMPLETED, `request_intervention` -> NEEDS_HUMAN_INTERVENTION, `unrecoverable_error` -> FAILED, `pause` -> PAUSED, `cancel` -> FAILED
  - WAITING_FOR_REPLY: `contact_replies` -> WAITING_FOR_AGENT, `heartbeat_fires` -> HEARTBEAT_SCHEDULED, `end_conversation` -> COMPLETED, `pause` -> PAUSED, `cancel` -> FAILED
  - WAITING_FOR_AGENT: `agent_processes_reply` -> ACTIVE, `end_conversation` -> COMPLETED, `pause` -> PAUSED, `cancel` -> FAILED
  - HEARTBEAT_SCHEDULED: `followup_sent` -> WAITING_FOR_REPLY, `max_followups_exceeded` -> ABANDONED, `pause` -> PAUSED, `cancel` -> FAILED
  - PAUSED: `resume` -> (previous_state), `cancel` -> FAILED
  - NEEDS_HUMAN_INTERVENTION: `resume` -> ACTIVE, `manual_send` -> ACTIVE, `pause` -> PAUSED, `cancel` -> FAILED
  - Terminal states (COMPLETED, ABANDONED, FAILED): no outgoing transitions

### 2. Implement transition function
- [x] `async transition(instanceId: string, event: string): Promise<TransitionResult>`
  - Look up instance from InstanceStore
  - Validate transition against table
  - Special handling for PAUSED: store `previous_state` on pause, restore on resume
  - Special handling for cancel: set `failure_reason = "cancelled"`
  - Persist new state via InstanceStore.update()
  - Log transition via logger
  - Return `{ success: true, from, to, instance }` or `{ success: false, error }`

### 3. Implement helper functions
- [x] `getValidTransitions(state: InstanceState): string[]` -- returns list of valid events for given state
- [x] `isTerminalState(state: InstanceState): boolean`

### 4. Verify
- [x] Run `tsc --noEmit` -- must pass
- [x] Manually verify: all 30+ transitions from Design Doc table are in the data structure
- [x] Verify: terminal states have no outgoing transitions
- [x] Verify: PAUSED stores and restores previous_state

## Completion Criteria
- [x] All 30+ transitions from Design Doc implemented in transition table
- [x] Invalid transitions rejected with descriptive error (current state, attempted event, instance ID)
- [x] PAUSED stores `previous_state`, resume restores it
- [x] Terminal states (COMPLETED, ABANDONED, FAILED) have no outgoing transitions
- [x] `tsc --noEmit` passes
- [x] Operation verified: L3 (Build Success Verification)

## Notes
- Impact scope: New file `apps/cli/src/engine/state-machine.ts`
- Constraints: Every state transition must persist to disk before side effects execute (Design Doc invariant)
- This is the most critical piece of domain logic -- accuracy of the transition table is paramount
- Use `.js` extension in imports: `import { InstanceStore } from '../store/instances.js'`
