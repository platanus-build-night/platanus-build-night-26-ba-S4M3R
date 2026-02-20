# Task 3.4: Concurrency Queue -- FIFO Queue Per Contact, Instance Activation

Metadata:
- Dependencies: Task 1.5 (state machine), Task 1.4 (instance store)
- Provides: `apps/cli/src/engine/queue.ts`
- Size: Small (1 file)

## Implementation Content
Create the queue manager that enforces the one-active-instance-per-contact invariant. When a new instance is created for a contact that already has an active instance, the new one enters QUEUED state. When the active instance reaches a terminal state, the next queued instance is dequeued and activated.

Reference: Design Doc "Component 10: Queue Manager", AC-3 (queued creation), AC-4 (queue transitions).

## Target Files
- [x] `apps/cli/src/engine/queue.ts` (create)

## Implementation Steps

### 1. Create engine/queue.ts
- [x] Import instance store, state machine

### 2. Implement enqueue logic
- [x] `enqueueOrActivate(instance: ConversationInstance): Promise<InstanceState>`
  - Call `instanceStore.getActiveForContact(instance.target_contact)`
  - If active instance exists: transition new instance to QUEUED, return 'QUEUED'
  - If no active instance: leave as CREATED, return 'CREATED'

### 3. Implement dequeue on terminal
- [x] `onInstanceTerminal(instanceId: string): Promise<void>`
  - Get the terminated instance to find its contact
  - Query `instanceStore.getByContact(contact)` for QUEUED instances
  - If any QUEUED instances exist:
    - Get the oldest one (by created_at -- FIFO)
    - Trigger `prior_instance_terminal` event on state machine (QUEUED -> CREATED)
    - Log at info level: "Dequeued instance {id} for contact {contact}"
  - If no queued instances: no action

### 4. Implement queue inspection
- [x] `getQueueForContact(contact: string): Promise<ConversationInstance[]>`
  - Return ordered list of QUEUED instances for contact (oldest first)

### 5. Enforce invariant
- [x] At most one non-terminal, non-QUEUED instance per contact
- [x] Validate this invariant in `enqueueOrActivate`

### 6. Verify
- [x] Run `tsc --noEmit` -- must pass

## Completion Criteria
- [x] Second instance for same contact enters QUEUED state
- [x] When first instance reaches terminal state, second transitions to CREATED
- [x] FIFO ordering preserved (oldest queued instance dequeued first)
- [x] At most one non-terminal, non-QUEUED instance per contact invariant enforced
- [x] `getQueueForContact` returns correct ordered list
- [x] `tsc --noEmit` passes
- [x] Operation verified: L3 (Build Success)

## Notes
- Impact scope: New file `apps/cli/src/engine/queue.ts`
- Constraints: Queue is in-memory + persisted via instance state in lowdb
- Terminal states: COMPLETED, ABANDONED, FAILED
- The queue manager must be called from instance creation route and from state machine on terminal transitions
