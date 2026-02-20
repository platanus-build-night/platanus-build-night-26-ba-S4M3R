# Phase 4 Completion: Integration + Polish (Quality Assurance)

Metadata:
- Dependencies: Tasks 4.1 through 4.3 all completed
- Size: Verification only (no new code)

## Purpose
Final quality assurance phase. Verify all acceptance criteria are met and the system is robust.

## Task Completion Checklist
- [ ] Task 4.1: All E2E flows tested and integration issues fixed
- [ ] Task 4.2: All error categories handled per Design Doc
- [ ] Task 4.3: Graceful shutdown with zero data loss and restart reconstruction

## Phase Completion Criteria
- [ ] All E2E conversation flows work correctly
- [ ] All error categories handled per Design Doc error table
- [ ] Graceful shutdown preserves state with zero data loss
- [ ] Daemon restart reconstructs heartbeat timers
- [ ] All 9 AC groups from Design Doc satisfied
- [ ] `tsc --noEmit` passes with zero errors
- [ ] Build succeeds

## Acceptance Criteria Verification

### AC-1: Daemon Lifecycle
- [ ] `relay start` spawns daemon, writes PID, binds to 127.0.0.1:3214
- [ ] `relay stop` flushes state and terminates daemon
- [ ] `relay start` when already running shows appropriate message
- [ ] Daemon-dependent commands show error when daemon not running

### AC-2: WhatsApp Connection
- [ ] `relay init` displays QR code
- [ ] Auth persists across restarts
- [ ] Auto-reconnect on transient disconnection

### AC-3: Instance Creation
- [ ] `relay create` creates instance in CREATED state
- [ ] Second instance for same contact enters QUEUED
- [ ] QUEUED instance activates when prior reaches terminal

### AC-4: State Machine Transitions
- [ ] Valid transitions execute correctly
- [ ] Invalid transitions rejected with error
- [ ] Pause stores previous_state, resume restores
- [ ] Cancel transitions to FAILED with reason

### AC-5: Agent Tools
- [ ] send_message delivers via WhatsApp and records transcript
- [ ] mark_todo_item updates storage
- [ ] end_conversation transitions to COMPLETED
- [ ] schedule_next_heartbeat schedules timer
- [ ] place_call returns "not yet available"
- [ ] request_human_intervention transitions to NEEDS_HUMAN_INTERVENTION

### AC-6: Heartbeat System
- [ ] Follow-up sent after configured interval
- [ ] ABANDONED after max follow-ups
- [ ] Timers suspended when PAUSED

### AC-7: Observability
- [ ] `relay list` shows all instances
- [ ] `relay get <id>` shows full details
- [ ] `relay transcript <id>` shows message history
- [ ] `relay status` shows daemon info
- [ ] `relay status --json` returns JSON

### AC-8: Manual Message Injection
- [ ] `relay send` on active instance delivers message
- [ ] `relay send` on NEEDS_HUMAN_INTERVENTION transitions to ACTIVE

### AC-9: Persistence
- [ ] Graceful restart preserves all state
- [ ] Heartbeat timers reconstructed on restart

## E2E Verification Procedures

### 1. Full lifecycle E2E (all Integration Points)
- [ ] `relay init` -> scan QR -> `relay start` -> `relay create --objective "Schedule meeting" --contact "+1234567890" --todos "Propose time,Confirm attendance"` -> verify first message sent -> reply from contact -> verify agent response -> `relay get <id>` shows todos updated -> agent calls `end_conversation` -> verify COMPLETED state

### 2. Daemon restart recovery
- [ ] Create instance, send messages, verify transcript has entries
- [ ] `relay stop` then `relay start`
- [ ] `relay get <id>` shows same state as before shutdown
- [ ] `relay transcript <id>` shows same messages
- [ ] If instance was in WAITING_FOR_REPLY, verify heartbeat timer reconstructed

### 3. Error scenario validation
- [ ] Kill daemon process, run `relay list` -> verify "Daemon not running" error
- [ ] Attempt invalid transition (e.g., `relay resume` on ACTIVE instance) -> verify HTTP 409
- [ ] Attempt `relay get <nonexistent-id>` -> verify HTTP 404

### 4. Performance spot-check
- [ ] Measure `relay list` latency (target: <1s)
- [ ] Verify daemon startup time (target: <5s)

## Final Quality Checks
- [ ] `tsc --noEmit` passes with zero errors
- [ ] Build succeeds (`npm run build -w apps/cli`)
- [ ] All files lint-clean
- [ ] All 9 AC groups validated (AC-1 through AC-9)
