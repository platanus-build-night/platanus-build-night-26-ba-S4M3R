# Task 1.4: Local JSON Store -- lowdb Setup with Config, Instances, Transcripts

Metadata:
- Dependencies: Task 1.2 (types.ts), Task 1.3 (logger.ts)
- Provides: `apps/cli/src/store/index.ts`, `config.ts`, `instances.ts`, `transcripts.ts`
- Size: Medium (4 files)

## Implementation Content
Create the persistence layer using lowdb. This includes store initialization, directory setup, and CRUD stores for config, conversation instances, and transcripts. All stores flush to disk on every write. The daemon is the sole writer; CLI reads only through the daemon HTTP API.

Reference: Design Doc "Component 7: Storage Layer" and Work Plan Task 1.4.

## Target Files
- [x] `apps/cli/src/store/index.ts` (create)
- [x] `apps/cli/src/store/config.ts` (create)
- [x] `apps/cli/src/store/instances.ts` (create)
- [x] `apps/cli/src/store/transcripts.ts` (create)

## Implementation Steps

### 1. Create store/index.ts -- lowdb initialization
- [x] Import `JSONFilePreset` from `lowdb/node`
- [x] Create `.relay-agent/` directory if not exists
- [x] Initialize three lowdb databases:
  - `.relay-agent/config.json` with default `RelayConfig`
  - `.relay-agent/instances.json` with default `{ instances: [] }`
  - `.relay-agent/transcripts.json` with default `{ transcripts: [] }`
- [x] Export an `initStores()` async function that initializes all three databases
- [x] Export database instances for use by individual stores

### 2. Create store/config.ts -- ConfigStore
- [x] Implement `getConfig(): Promise<RelayConfig>`
- [x] Implement `updateConfig(partial: Partial<RelayConfig>): Promise<void>` -- merge and flush
- [x] Default config: `{ model_api_key: null, model_provider: null, whatsapp_connected: false, daemon_port: 3214 }`

### 3. Create store/instances.ts -- InstanceStore
- [x] Implement `create(data: Omit<ConversationInstance, 'id' | 'created_at' | 'updated_at'>): Promise<ConversationInstance>` -- generate UUID, set timestamps
- [x] Implement `getById(id: string): Promise<ConversationInstance | null>`
- [x] Implement `getAll(): Promise<ConversationInstance[]>`
- [x] Implement `getByContact(contact: string): Promise<ConversationInstance[]>`
- [x] Implement `getActiveForContact(contact: string): Promise<ConversationInstance | null>` -- returns instance in non-terminal, non-QUEUED state
- [x] Implement `update(id: string, data: Partial<ConversationInstance>): Promise<ConversationInstance>` -- set updated_at, flush
- [x] All writes call `db.write()` to flush to disk

### 4. Create store/transcripts.ts -- TranscriptStore
- [x] Implement `append(message: Omit<TranscriptMessage, 'id'>): Promise<TranscriptMessage>` -- generate UUID, flush
- [x] Implement `getByInstance(instanceId: string): Promise<TranscriptMessage[]>` -- return ordered by timestamp

### 5. Verify
- [x] Run `tsc --noEmit` -- must pass
- [x] Verify data persists: create instance, restart process, read back

## Completion Criteria
- [x] All 4 store files created with complete CRUD operations
- [x] Data persists to `.relay-agent/*.json` files
- [x] `getActiveForContact` correctly filters non-terminal, non-QUEUED instances
- [x] All writes flush to disk via `db.write()`
- [x] `tsc --noEmit` passes
- [x] Operation verified: L3 (Build Success Verification)

## Notes
- Impact scope: New files in `apps/cli/src/store/`
- Constraints: lowdb only (per ADR-003); daemon is sole writer
- ESM import: `import { JSONFilePreset } from 'lowdb/node'`
- Use `.js` extension in local imports for ESM compatibility
