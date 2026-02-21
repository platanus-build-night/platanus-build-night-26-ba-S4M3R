# Phase 3 Completion: Agent + Engine

Metadata:
- Dependencies: Tasks 3.1 through 3.5 all completed
- Size: Verification only (no new code)

## Purpose
Verify that the agent runtime, heartbeat system, and concurrency queue are operational before proceeding to Phase 4.

## Task Completion Checklist
- [ ] Task 3.1: All 6 agent tools defined with correct signatures and side effects
- [ ] Task 3.2: Agent sessions created per instance with conversation-scoped tools
- [ ] Task 3.3: Heartbeat timers fire, follow-ups sent, max exceeded -> ABANDONED
- [ ] Task 3.4: Per-contact FIFO queue operational
- [ ] Task 3.5: Full conversation flow wired (create -> message -> response -> heartbeat -> completion)

## Phase Completion Criteria
- [ ] Agent sessions created per instance with correct conversation-scoped tools
- [ ] `send_message` tool delivers via WhatsApp and records in transcript
- [ ] `mark_todo_item` updates todo status in storage
- [ ] `end_conversation` transitions to COMPLETED
- [ ] `schedule_next_heartbeat` schedules timer correctly
- [ ] Stub tools (`place_call`, `request_human_intervention`) log and respond appropriately
- [ ] Heartbeat follow-ups sent after configured interval
- [ ] Max follow-ups exceeded -> ABANDONED
- [ ] Per-contact FIFO queue operational
- [ ] Full autonomous conversation loop works end-to-end

## E2E Verification Procedures

### 1. Agent-to-WhatsApp (Integration Point 4)
- [ ] Create instance with objective and contact -- verify agent sends first message via WhatsApp
- [ ] Check transcript -- verify message recorded with role `agent`

### 2. Incoming message to agent (Integration Point 5)
- [ ] Send reply from contact's WhatsApp
- [ ] Verify `relay get <id>` shows state transitions: WAITING_FOR_REPLY -> WAITING_FOR_AGENT -> ACTIVE
- [ ] Verify agent response sent back to contact

### 3. Heartbeat cycle (Integration Point 6)
- [ ] Create instance with short heartbeat interval (e.g., 60s for testing)
- [ ] Wait without replying -- verify follow-up message sent
- [ ] Verify `follow_up_count` incremented in `relay get <id>`

### 4. Concurrency queue
- [ ] Create two instances for same contact
- [ ] Verify second enters QUEUED state
- [ ] Complete first instance -- verify second transitions to CREATED then ACTIVE

## Quality Checks
- [ ] `tsc --noEmit` passes with zero errors
- [ ] Build succeeds
