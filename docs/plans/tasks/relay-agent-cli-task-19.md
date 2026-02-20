# Task 4.3: Graceful Shutdown -- Persist State on SIGTERM/SIGINT, Restore on Restart

Metadata:
- Dependencies: Task 4.2 (error handling complete)
- Size: Small (2-3 files modified)

## Implementation Content
Implement graceful shutdown handlers that persist all state to disk on SIGTERM/SIGINT, close the WhatsApp connection, and remove the PID file. On restart, restore all instances from disk and reconstruct heartbeat timers.

Reference: Design Doc AC-9 (persistence), "Boundary: Daemon -> Storage (lowdb)", Work Plan Task 4.3.

## Target Files
- [x] `apps/cli/src/daemon/entry.ts` (modify -- register signal handlers, reconstruction on start)
- [x] `apps/cli/src/engine/heartbeat.ts` (modify -- ensure reconstructTimers() is called on start)
- [x] `apps/cli/src/agent/session.ts` (modify -- ensure sessions reconstructed for active instances)

## Implementation Steps

### 1. Register shutdown signal handlers
- [x] In `daemon/entry.ts`, register handlers for SIGTERM and SIGINT
- [x] On signal received:
  1. Log "Shutting down gracefully..."
  2. Flush all lowdb stores to disk (`db.write()` for config, instances, transcripts)
  3. Close WhatsApp connection gracefully (`disconnectWhatsApp()`)
  4. Destroy all active agent sessions
  5. Cancel all heartbeat timers
  6. Remove PID file (`.relay-agent/daemon.pid`)
  7. Log "Shutdown complete"
  8. `process.exit(0)`

### 2. Implement restart reconstruction
- [x] In `daemon/entry.ts`, on startup (after stores initialized):
  1. Query all instances from store
  2. For instances in non-terminal states:
    - WAITING_FOR_REPLY, HEARTBEAT_SCHEDULED: reconstruct heartbeat timers via `heartbeatManager.reconstructTimers()`
    - ACTIVE, WAITING_FOR_AGENT: reconstruct agent sessions via `sessionManager.reconstructSession()`
    - PAUSED: no action needed (timers/sessions restored on resume)
    - QUEUED: no action needed
    - CREATED: auto-activate (create session, send first message)
  3. Log "Restored {count} instances from disk"

### 3. Verify zero data loss
- [x] All lowdb stores flushed on shutdown
- [x] Instance states preserved across restart
- [x] Transcript messages preserved across restart
- [x] Heartbeat timers reconstructed for appropriate states

### 4. Verify
- [x] Run `tsc --noEmit` -- must pass
- [x] Test: create instance, send messages, `relay stop`, `relay start`, verify state and transcript preserved

## Completion Criteria
- [x] SIGTERM and SIGINT handlers registered on daemon process
- [x] All stores flushed to disk on shutdown
- [x] WhatsApp connection closed gracefully
- [x] PID file removed on shutdown
- [x] On restart: instances restored from disk
- [x] On restart: heartbeat timers reconstructed for WAITING_FOR_REPLY and HEARTBEAT_SCHEDULED instances
- [x] On restart: agent sessions reconstructed for active instances
- [x] Zero data loss for graceful shutdown scenarios
- [x] `tsc --noEmit` passes
- [x] Operation verified: L1 (Functional Operation -- stop/start preserves state)

## Notes
- Impact scope: Modifies daemon entry point, heartbeat, and agent session
- Constraints: Must read existing files before modifying
- pi-mono session reconstruction is an uncertainty area (noted in Work Plan) -- fallback is replaying objective + todos + transcript
- Signal handlers use a shutdown flag to prevent double-shutdown
