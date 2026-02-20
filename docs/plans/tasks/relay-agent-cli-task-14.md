# Task 3.3: Heartbeat System -- Timer Management, Follow-up Logic, Auto-abandon

Metadata:
- Dependencies: Task 3.2 (agent session for generating follow-up messages)
- Provides: `apps/cli/src/engine/heartbeat.ts`
- Size: Small (1 file)

## Implementation Content
Create the heartbeat manager that schedules follow-up timers, invokes the agent for follow-up messages when timers fire, handles max follow-up exceeded (auto-abandon), and reconstructs timers on daemon restart.

Reference: Design Doc "Component 9: Heartbeat Manager", "Heartbeat Follow-up Cycle" sequence diagram, AC-6.

## Target Files
- [x] `apps/cli/src/engine/heartbeat.ts` (create)

## Implementation Steps

### 1. Create engine/heartbeat.ts
- [x] Maintain a `Map<string, NodeJS.Timeout>` of active timers keyed by instanceId
- [x] Import state machine, instance store, agent session manager

### 2. Implement timer scheduling
- [x] `scheduleHeartbeat(instanceId: string, delayMs: number): void`
  - Cancel any existing timer for this instance
  - Schedule `setTimeout` with delay
  - Store timer reference in map
  - Log at debug level: "Heartbeat scheduled for instance {id} in {delay}ms"

### 3. Implement timer cancellation
- [x] `cancelHeartbeat(instanceId: string): void`
  - Clear timer via `clearTimeout`
  - Remove from map
  - Log at debug level: "Heartbeat cancelled for instance {id}"

### 4. Implement timer fire handler
- [x] When timer fires:
  - Read instance from store
  - Check `follow_up_count` vs `heartbeat_config.max_followups`
  - If under limit:
    - Trigger `heartbeat_fires` event on state machine (WAITING_FOR_REPLY -> HEARTBEAT_SCHEDULED)
    - Invoke agent session to generate follow-up message
    - After agent sends message, trigger `followup_sent` event (HEARTBEAT_SCHEDULED -> WAITING_FOR_REPLY)
    - Increment `follow_up_count` in instance store
    - Schedule next heartbeat
  - If at/over limit:
    - Trigger `max_followups_exceeded` event on state machine (HEARTBEAT_SCHEDULED -> ABANDONED)
    - Clean up timer
    - Log at info level: "Instance {id} abandoned after {count} follow-ups"

### 5. Implement timer reconstruction
- [x] `reconstructTimers(): Promise<void>`
  - On daemon restart, query instance store for all instances in WAITING_FOR_REPLY or HEARTBEAT_SCHEDULED state
  - For each: calculate remaining time (or use full interval) and schedule heartbeat
  - Log at info level: "Reconstructed {count} heartbeat timers"

### 6. Implement pause/resume support
- [x] `suspendHeartbeat(instanceId: string): void` -- cancel timer without clearing state (for PAUSED)
- [x] On resume: re-schedule with original interval

### 7. Verify
- [x] Run `tsc --noEmit` -- must pass

## Completion Criteria
- [x] Heartbeat timers fire correctly after configured interval
- [x] Follow-up messages sent via agent on timer fire
- [x] `follow_up_count` incremented on each follow-up
- [x] Max follow-ups exceeded transitions to ABANDONED
- [x] `cancelHeartbeat()` stops timer
- [x] `reconstructTimers()` recreates timers for WAITING_FOR_REPLY/HEARTBEAT_SCHEDULED instances
- [x] Timers suspended when instance enters PAUSED
- [x] `tsc --noEmit` passes
- [x] Operation verified: L3 (Build Success)

## Notes
- Impact scope: New file `apps/cli/src/engine/heartbeat.ts`
- Constraints: setTimeout-based timers (no external scheduler)
- Timer accuracy within 30s is acceptable (Design Doc non-functional requirement)
- On daemon restart, exact remaining time may be lost -- using full interval is acceptable
