# Task 4.2: Error Handling -- All Error Categories from Design Doc

Metadata:
- Dependencies: Task 4.1 (integration issues fixed)
- Size: Medium (3-5 files modified)

## Implementation Content
Implement comprehensive error handling for all error categories defined in the Design Doc. Each error should be caught at the appropriate layer and produce a clear, actionable response.

Reference: Design Doc "Error Categories and Responses" table, AC-1 (daemon errors), AC-2 (WhatsApp errors), AC-4 (invalid transitions).

## Target Files
- [x] `apps/cli/src/commands/*.ts` (modify -- CLI-side error handling)
- [x] `apps/cli/src/daemon/routes.ts` (modify -- API error responses)
- [x] `apps/cli/src/whatsapp/connection.ts` (modify -- reconnection failure handling)
- [x] `apps/cli/src/agent/session.ts` (modify -- agent error -> NEEDS_HUMAN_INTERVENTION)
- [x] `apps/cli/src/daemon/lifecycle.ts` (modify -- stale PID, port conflict)

## Implementation Steps

### 1. CLI-side errors
- [x] Daemon not running: catch connection refused from `fetch()`, display "Daemon not running. Run `relay start` first." to stderr
- [x] Instance not found: handle HTTP 404, display "Instance {id} not found"
- [x] Invalid transition: handle HTTP 409, display current state and what was attempted

### 2. API-side errors
- [x] Missing required fields on POST /instances: HTTP 400 with field names
- [x] Invalid state transition: HTTP 409 with `{ error: "Invalid transition", details: "Cannot {event} from {state}" }`
- [x] Instance not found: HTTP 404 with `{ error: "Instance not found" }`
- [x] Unexpected errors: HTTP 500 with generic message (log full error server-side)

### 3. WhatsApp errors
- [x] Disconnection: already handled by exponential backoff (Task 2.1)
- [x] 5+ reconnect failures: set `whatsapp_connected = false` in config, log critical error
- [x] Ensure instances in WAITING_FOR_REPLY continue waiting (timers still active)

### 4. Agent errors
- [x] pi-mono session error/rejection: catch, log with full context, transition instance to NEEDS_HUMAN_INTERVENTION
- [x] Network timeout: retry once, then NEEDS_HUMAN_INTERVENTION
- [x] Unrecoverable error: trigger `unrecoverable_error` -> FAILED

### 5. Storage errors
- [x] lowdb `write()` failure: log error, continue with in-memory state, retry on next write
- [x] No crash on storage error

### 6. Daemon lifecycle errors
- [x] Stale PID file: detect (process not running), remove file, start fresh
- [x] Port 3214 in use: display "Port 3214 is already in use. Stop the conflicting process or configure a different port."

### 7. Verify
- [x] Run `tsc --noEmit` -- must pass
- [x] Test each error scenario manually

## Completion Criteria
- [x] All error categories from Design Doc "Error Categories and Responses" table handled
- [x] CLI displays clear, actionable error messages to stderr
- [x] API returns correct HTTP status codes (400, 404, 409, 500)
- [x] WhatsApp reconnection failure sets `whatsapp_connected = false`
- [x] Agent errors transition to NEEDS_HUMAN_INTERVENTION
- [x] Storage errors logged but don't crash daemon
- [x] Stale PID files auto-cleaned
- [x] Port conflict shows clear message
- [x] `tsc --noEmit` passes
- [x] Operation verified: L1 (Functional Operation -- error scenarios produce correct responses)

## Notes
- Impact scope: Modifies multiple existing files
- Constraints: Must read existing files before modifying
- Error messages should be user-friendly (not stack traces)
- Follow fail-fast principle: errors explicit with context, no silent fallbacks
