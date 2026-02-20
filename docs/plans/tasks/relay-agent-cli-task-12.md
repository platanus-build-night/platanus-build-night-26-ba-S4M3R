# Task 3.1: Agent Tools -- Define Custom pi-mono Tools

Metadata:
- Dependencies: Task 2.3 (WhatsApp wired for send_message), Task 1.5 (state machine for end_conversation)
- Provides: `apps/cli/src/agent/tools.ts`
- Size: Small (1 file)

## Implementation Content
Define the 6 conversation-scoped tools available to pi-mono agent sessions. Each tool receives instance context via closure/binding. Real tools produce side effects (send WhatsApp messages, update storage, trigger state transitions). Stub tools log and return placeholder responses.

Reference: Design Doc "Component 12: Conversation Tools", AC-5.

## Target Files
- [x] `apps/cli/src/agent/tools.ts` (create)

## Implementation Steps

### 1. Define tool factory
- [x] Create `createConversationTools(context)` factory function
  - `context` includes: `instanceId`, `whatsappConnection`, `instanceStore`, `transcriptStore`, `stateMachine`, `heartbeatManager` (null initially, wired in Task 3.5)
  - Returns array of tool definitions compatible with pi-mono `createAgentSession`

### 2. Implement real tools

- [x] `send_message(text: string)`:
  - Send message via WhatsApp: `connection.sendMessage(jid, text)`
  - Append to transcript: `{ instance_id, role: 'agent', content: text, timestamp }`
  - Trigger `message_sent` event on state machine
  - Return `{ success: true }`

- [x] `mark_todo_item(todo_id: string, status: 'pending' | 'in_progress' | 'completed' | 'skipped')`:
  - Read instance from store
  - Find todo by ID
  - Update todo status
  - Persist via instanceStore.update()
  - Return `{ success: true, todo_id, new_status }`

- [x] `end_conversation(reason: string)`:
  - Trigger `end_conversation` event on state machine
  - Return `{ success: true, reason }`

- [x] `schedule_next_heartbeat(delay_ms: number)`:
  - Call heartbeat manager to schedule timer (or store for later wiring)
  - Return `{ success: true, delay_ms }`

### 3. Implement stub tools

- [x] `place_call()`:
  - Log invocation at info level
  - Return `{ success: false, message: "Feature not yet available. Voice calls are planned for a future release." }`

- [x] `request_human_intervention(reason: string)`:
  - Trigger `request_intervention` event on state machine
  - Return `{ success: true, reason }`

### 4. Verify
- [x] Run `tsc --noEmit` -- must pass
- [x] All 6 tools have correct signatures and return types

## Completion Criteria
- [x] All 6 tools defined with correct signatures
- [x] `send_message` sends via WhatsApp and records transcript
- [x] `mark_todo_item` updates todo status in storage
- [x] `end_conversation` triggers state transition to COMPLETED
- [x] `schedule_next_heartbeat` schedules timer
- [x] `place_call` logs and returns "not yet available"
- [x] `request_human_intervention` triggers state transition to NEEDS_HUMAN_INTERVENTION
- [x] `tsc --noEmit` passes
- [x] Operation verified: L3 (Build Success)

## Notes
- Impact scope: New file `apps/cli/src/agent/tools.ts`
- Constraints: Tools must only perform conversation-scoped operations (no filesystem, no code execution -- Design Doc security requirement)
- Heartbeat manager dependency may be null until Task 3.3; handle gracefully
- Tool definitions must match pi-mono SDK's expected format
