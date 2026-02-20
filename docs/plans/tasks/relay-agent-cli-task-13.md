# Task 3.2: Agent Session Manager -- Create/Manage pi-mono Sessions Per Instance

Metadata:
- Dependencies: Task 3.1 (agent tools)
- Provides: `apps/cli/src/agent/session.ts`
- Size: Small (1 file)

## Implementation Content
Create the agent session manager that wraps pi-mono `createAgentSession`. Each conversation instance gets its own agent session with conversation-scoped tools. The session manager handles session creation with context injection, message processing, and session cleanup.

Reference: Design Doc "Component 11: Agent Session", ADR-002.

## Target Files
- [x] `apps/cli/src/agent/session.ts` (create)

## Implementation Steps

### 1. Create agent/session.ts
- [x] Import pi-mono SDK (`@mariozechner/pi-coding-agent` or correct package name)
- [x] Import `createConversationTools` from tools.ts

### 2. Implement session factory
- [x] `createSession(instance: ConversationInstance, deps: SessionDependencies): AgentSession`
  - Create conversation-scoped tools via `createConversationTools()`
  - Build system prompt with:
    - Conversation objective
    - Todo list (current status)
    - Transcript history (if any, for reconstruction)
    - Instructions: "You are a conversation agent. Use the provided tools to communicate with the contact and achieve the objective."
  - Call pi-mono `createAgentSession` with:
    - System prompt / context
    - Tool definitions (overriding defaults -- no filesystem, no code execution)
    - Model configuration from RelayConfig
  - Store session reference keyed by instanceId
  - Return session handle

### 3. Implement message processing
- [x] `processMessage(instanceId: string, message: string): Promise<void>`
  - Get session for instanceId
  - Feed incoming message to pi-mono session
  - Execute resulting tool calls (pi-mono handles this internally)
  - After processing, trigger `agent_processes_reply` event on state machine

### 4. Implement session lifecycle
- [x] `destroySession(instanceId: string): void`
  - Clean up pi-mono session resources
  - Remove from session map
- [x] `hasSession(instanceId: string): boolean`
- [x] `getSessionCount(): number`

### 5. Implement session reconstruction (for daemon restart)
- [x] `reconstructSession(instance: ConversationInstance, transcript: TranscriptMessage[]): AgentSession`
  - Same as createSession but with full transcript history for context
  - This is the uncertain area noted in Work Plan (pi-mono reconstruction fidelity)

### 6. Verify
- [x] Run `tsc --noEmit` -- must pass

## Completion Criteria
- [x] `createSession()` creates pi-mono session with conversation-scoped tools only
- [x] `processMessage()` feeds messages to agent and executes tool calls
- [x] `destroySession()` cleans up session resources
- [x] System prompt includes objective, todos, and transcript
- [x] Session factory uses dependency injection for testability
- [x] `tsc --noEmit` passes
- [x] Operation verified: L3 (Build Success -- L1 requires live LLM API)

## Notes
- Impact scope: New file `apps/cli/src/agent/session.ts`
- Constraints: Agent sessions must be sandboxed (no fs/code access per Design Doc)
- Certainty: Low for pi-mono SDK integration (package may have undocumented behavior)
  Exploratory implementation: true
  Fallback: Mock agent that logs tool calls for testing
- pi-mono package name may need verification on npm
