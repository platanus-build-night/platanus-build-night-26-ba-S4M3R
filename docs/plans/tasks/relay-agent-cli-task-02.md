# Task 1.2: Data Models and TypeScript Interfaces

Metadata:
- Dependencies: Task 1.1 (package setup with dependencies installed)
- Provides: `apps/cli/src/types.ts` (referenced by all subsequent tasks)
- Size: Small (1 file)

## Implementation Content
Create `apps/cli/src/types.ts` containing all contract definitions from the Design Doc. These types are the shared vocabulary for the entire system -- every subsequent task imports from this file.

Reference: Design Doc "Contract Definitions" section.

## Target Files
- [x] `apps/cli/src/types.ts` (create)

## Implementation Steps

### 1. Create types.ts with all contracts
- [x] Define `InstanceState` union type (11 states: CREATED, QUEUED, ACTIVE, WAITING_FOR_REPLY, WAITING_FOR_AGENT, HEARTBEAT_SCHEDULED, PAUSED, NEEDS_HUMAN_INTERVENTION, COMPLETED, ABANDONED, FAILED)
- [x] Define `TerminalState` type: `'COMPLETED' | 'ABANDONED' | 'FAILED'`
- [x] Define `NonTerminalState` type: `Exclude<InstanceState, TerminalState>`
- [x] Define `TodoItem` interface: `{ id: string; text: string; status: 'pending' | 'in_progress' | 'completed' | 'skipped' }`
- [x] Define `HeartbeatConfig` interface: `{ interval_ms: number; max_followups: number }`
- [x] Define `ConversationInstance` interface with all fields from Design Doc
- [x] Define `TranscriptMessage` interface: `{ id, instance_id, role, content, timestamp }`
- [x] Define `StateTransition` interface: `{ instance_id, from_state, to_state, trigger, timestamp }`
- [x] Define `RelayConfig` interface: `{ model_api_key, model_provider, whatsapp_connected, daemon_port }`
- [x] Define `CreateInstanceRequest` interface
- [x] Define `CreateInstanceResponse` interface
- [x] Define `SendMessageRequest` interface
- [x] Define `DaemonStatusResponse` interface
- [x] Define `ApiErrorResponse` interface
- [x] Export all types and interfaces

### 2. Verify
- [x] Run `tsc --noEmit -p apps/cli/tsconfig.json` -- must pass
- [x] Verify all types are importable from other files

## Completion Criteria
- [x] `apps/cli/src/types.ts` exists with all 14+ type/interface definitions from Design Doc
- [x] All types exported
- [x] `tsc --noEmit` passes with zero errors
- [x] Operation verified: L3 (Build Success Verification)

## Notes
- Impact scope: New file only, no existing code affected
- Constraints: Types must match Design Doc contract definitions exactly
- All subsequent tasks depend on these type definitions
