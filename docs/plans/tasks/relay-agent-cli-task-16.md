# Task 3.5: Wire Agent to Conversation Flow -- Connect Incoming Messages -> Agent -> Tools -> WhatsApp

Metadata:
- Dependencies: Task 3.2 (agent session), Task 3.3 (heartbeat), Task 3.4 (queue)
- Size: Medium (3-4 files modified)

## Implementation Content
Wire all agent, heartbeat, and queue components into the conversation flow. This connects: instance creation triggers agent first message, incoming messages trigger agent processing, heartbeat fires trigger follow-ups, terminal states trigger queue dequeue, and PAUSED/NEEDS_HUMAN_INTERVENTION are handled correctly.

Reference: Design Doc "Instance Creation and First Message Flow", "Incoming WhatsApp Message Handling" sequence diagrams, Work Plan Task 3.5.

## Target Files
- [x] `apps/cli/src/daemon/routes.ts` (modify -- wire instance creation to agent/queue)
- [x] `apps/cli/src/whatsapp/handler.ts` (modify -- wire to agent processing)
- [x] `apps/cli/src/engine/state-machine.ts` (modify -- add side effect hooks for terminal states)
- [x] `apps/cli/src/daemon/entry.ts` (modify -- initialize all components with proper dependency wiring)

## Implementation Steps

### 1. Wire instance creation (CREATED -> ACTIVE)
- [x] In `POST /instances` route handler:
  - After creating instance, call `queueManager.enqueueOrActivate(instance)`
  - If result is CREATED (not QUEUED): auto-activate
    - Create agent session via `sessionManager.createSession(instance)`
    - Agent sends first message (triggering `agent_sends_first_message` -> ACTIVE)
    - After first message sent, `message_sent` -> WAITING_FOR_REPLY
    - Schedule heartbeat timer

### 2. Wire incoming message -> agent processing
- [x] In message handler (handler.ts):
  - After `contact_replies` transition (WAITING_FOR_REPLY -> WAITING_FOR_AGENT):
    - Cancel active heartbeat timer
    - Call `sessionManager.processMessage(instanceId, messageText)`
    - After agent processes: `agent_processes_reply` -> ACTIVE
    - If agent sends response: `message_sent` -> WAITING_FOR_REPLY
    - Schedule new heartbeat timer

### 3. Wire heartbeat -> agent follow-up
- [x] Heartbeat manager already handles this (Task 3.3), verify wiring:
  - Timer fires -> `heartbeat_fires` -> HEARTBEAT_SCHEDULED
  - Agent generates follow-up -> sends message -> `followup_sent` -> WAITING_FOR_REPLY

### 4. Wire terminal states -> cleanup + queue
- [x] When any instance reaches terminal state (COMPLETED, ABANDONED, FAILED):
  - Destroy agent session: `sessionManager.destroySession(instanceId)`
  - Cancel heartbeat: `heartbeatManager.cancelHeartbeat(instanceId)`
  - Dequeue next: `queueManager.onInstanceTerminal(instanceId)`

### 5. Wire PAUSED handling
- [x] On PAUSED entry:
  - Suspend heartbeat timer
  - Pause agent processing (stop accepting messages)
- [x] On resume from PAUSED:
  - Restore previous state
  - Reconstruct heartbeat timer if previous state was WAITING_FOR_REPLY
  - Resume agent processing

### 6. Wire NEEDS_HUMAN_INTERVENTION
- [x] On entry: pause agent, cancel timers
- [x] On `relay resume`: transition to ACTIVE, resume agent
- [x] On `relay send` (manual_send): send message, transition to ACTIVE, resume agent

### 7. Initialize all components in daemon/entry.ts
- [x] Create proper dependency injection wiring:
  - Initialize stores
  - Create state machine with store reference
  - Create queue manager with store + state machine
  - Create heartbeat manager with store + state machine + session manager
  - Create session manager with tools factory
  - Create message handler with all dependencies
  - Connect WhatsApp
  - Start HTTP server with all dependencies

### 8. Verify
- [x] Run `tsc --noEmit` -- must pass

## Completion Criteria
- [x] Instance creation auto-activates agent and sends first message
- [x] Incoming messages trigger agent processing and response
- [x] Heartbeat timers fire and agent sends follow-ups
- [x] Terminal states clean up sessions and dequeue next instance
- [x] PAUSED suspends all processing, resume restores
- [x] NEEDS_HUMAN_INTERVENTION pauses agent, `relay resume` or `relay send` resumes
- [x] All components properly wired with dependency injection
- [x] `tsc --noEmit` passes
- [x] Operation verified: L3 (Build Success -- full L1 requires live WhatsApp + LLM)

## Notes
- Impact scope: Modifies 3-4 existing files (routes.ts, handler.ts, state-machine.ts, entry.ts)
- Constraints: Must read existing files before modifying
- This is the integration task that connects all Phase 3 components
- Event serialization: all events for a single instance should be processed sequentially (no parallel state mutations)
