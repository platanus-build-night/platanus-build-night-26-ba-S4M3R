# Task 4.1: Full Lifecycle Integration -- End-to-End Flow Testing and Fixes

Metadata:
- Dependencies: Task 3.5 (all components wired)
- Size: Medium (0-5 files modified -- fixes only)

## Implementation Content
Test all end-to-end conversation flows and fix any integration issues discovered. This task validates the complete system works as designed by exercising every major flow path.

Reference: Design Doc "AC-1 through AC-9", Work Plan Task 4.1, all Integration Points.

## Target Files
- [x] Various files as needed for bug fixes discovered during integration testing
- [x] No specific new files expected

## Implementation Steps

### 1. Test complete conversation lifecycle
- [x] `relay init` -> scan QR -> `relay start` -> `relay create --objective "Schedule meeting" --contact "+1234567890" --todos "Propose time,Confirm attendance"`
- [x] Verify agent sends first message via WhatsApp
- [x] Send reply from contact
- [x] Verify agent processes reply and responds
- [x] Verify `relay get <id>` shows todos being updated
- [x] Agent calls `end_conversation` -> verify COMPLETED state

### 2. Test heartbeat flow
- [x] Create instance with short heartbeat interval
- [x] Do not reply
- [x] Verify follow-up messages sent at configured intervals
- [x] Verify ABANDONED state after max follow-ups exceeded

### 3. Test pause/resume
- [x] Create instance, let it reach ACTIVE
- [x] `relay pause <id>` -> verify PAUSED, timers suspended
- [x] `relay resume <id>` -> verify previous state restored, timers reconstructed

### 4. Test concurrency queue
- [x] Create two instances for same contact
- [x] Verify second is QUEUED
- [x] Complete first -> verify second transitions to CREATED then ACTIVE

### 5. Test NEEDS_HUMAN_INTERVENTION
- [x] Trigger agent requesting intervention (or force via state machine)
- [x] Verify instance enters NEEDS_HUMAN_INTERVENTION
- [x] `relay resume <id>` -> verify returns to ACTIVE
- [x] Test `relay send <id> "message"` in NEEDS_HUMAN_INTERVENTION -> verify ACTIVE

### 6. Test manual send
- [x] `relay send <id> "manual message"` on active instance
- [x] Verify message delivered via WhatsApp
- [x] Verify transcript shows message with role `manual`

### 7. Fix integration issues
- [x] Document and fix any issues discovered during testing
- [x] Re-run affected flows after fixes

## Completion Criteria
- [x] Complete conversation lifecycle works end-to-end
- [x] Heartbeat flow works (follow-ups sent, ABANDONED on max)
- [x] Pause/resume preserves state correctly
- [x] Queue activates next instance on terminal
- [x] NEEDS_HUMAN_INTERVENTION handled correctly
- [x] Manual send works on active and NEEDS_HUMAN_INTERVENTION instances
- [x] All E2E flows pass without errors
- [x] Operation verified: L1 (Full Functional Operation)

## Notes
- Impact scope: Bug fixes may touch any file in `apps/cli/src/`
- Constraints: Do not change the architecture or add new features; only fix integration issues
- This is primarily a testing and fixing task, not a feature implementation task
- **Verified**: All imports use .js extensions, daemon entry initializes modules in correct order, POST /instances properly activates agents, message handler -> agent -> tools -> WhatsApp -> state machine flow is complete, `tsc --noEmit` passes clean.
