# Task 1.8: CLI Commands -- All Commander Commands Wired to Daemon HTTP Calls

Metadata:
- Dependencies: Task 1.7 (daemon lifecycle)
- Provides: `apps/cli/src/index.ts` (rewrite), `apps/cli/src/commands/*.ts` (12 commands)
- Size: Large but cohesive (13 files -- all follow same pattern: parse args -> HTTP call -> format output)

## Implementation Content
Rewrite the CLI entry point with Commander.js and create all 12 command handlers. Each command parses arguments, makes an HTTP request to the daemon, and formats the response for stdout. All commands detect daemon-not-running and display clear errors.

Reference: Design Doc "Component 1: CLI Entry Point", "Component 2: Command Handlers", "API Routes" section.

## Target Files
- [x] `apps/cli/src/index.ts` (rewrite)
- [x] `apps/cli/src/commands/init.ts` (create)
- [x] `apps/cli/src/commands/start.ts` (create)
- [x] `apps/cli/src/commands/stop.ts` (create)
- [x] `apps/cli/src/commands/status.ts` (create)
- [x] `apps/cli/src/commands/create.ts` (create)
- [x] `apps/cli/src/commands/list.ts` (create)
- [x] `apps/cli/src/commands/get.ts` (create)
- [x] `apps/cli/src/commands/transcript.ts` (create)
- [x] `apps/cli/src/commands/cancel.ts` (create)
- [x] `apps/cli/src/commands/pause.ts` (create)
- [x] `apps/cli/src/commands/resume.ts` (create)
- [x] `apps/cli/src/commands/send.ts` (create)

## Implementation Steps

### 1. Rewrite src/index.ts
- [x] Import Commander.js `program`
- [x] Set program name `relay`, description, version from package.json
- [x] Register all 12 commands
- [x] Call `program.parse()`

### 2. Create HTTP helper utility
- [x] Create a shared `daemonRequest(method, path, body?)` function that:
  - Makes HTTP request to `http://localhost:3214${path}`
  - Catches connection refused and displays "Daemon not running. Run `relay start` first."
  - Parses JSON response
  - Returns `{ status, data }` or throws on error

### 3. Create command handlers (each follows same pattern)

- [x] `init.ts` -- `relay init`: POST /init with optional `--api-key` and `--provider` options
- [x] `start.ts` -- `relay start`: Call `startDaemon()` from lifecycle (no HTTP)
- [x] `stop.ts` -- `relay stop`: Call `stopDaemon()` from lifecycle (no HTTP)
- [x] `status.ts` -- `relay status [--json]`: GET /status, format output (human-readable or JSON)
- [x] `create.ts` -- `relay create --objective <text> --contact <phone> --todos <items> [--heartbeat-interval <ms>] [--max-followups <n>]`: POST /instances
  - `--todos` accepts comma-separated items
  - Display returned instance ID and state
- [x] `list.ts` -- `relay list`: GET /instances, display as table
- [x] `get.ts` -- `relay get <id>`: GET /instances/:id, display full details
- [x] `transcript.ts` -- `relay transcript <id>`: GET /instances/:id/transcript, display messages
- [x] `cancel.ts` -- `relay cancel <id>`: POST /instances/:id/cancel
- [x] `pause.ts` -- `relay pause <id>`: POST /instances/:id/pause
- [x] `resume.ts` -- `relay resume <id>`: POST /instances/:id/resume
- [x] `send.ts` -- `relay send <id> <message>`: POST /instances/:id/send with message body

### 4. Output formatting
- [x] Human-readable formatted output by default (tables, key-value pairs)
- [x] `--json` flag on `relay status` for machine-parseable JSON output
- [x] Error messages to stderr

### 5. Verify
- [x] Run `tsc --noEmit` -- must pass
- [x] `relay --help` shows all 12 commands
- [x] Each command parses arguments correctly

## Completion Criteria
- [x] `apps/cli/src/index.ts` registers all 12 commands with Commander.js
- [x] All 12 command files created in `apps/cli/src/commands/`
- [x] All commands detect daemon-not-running with clear error message
- [x] `relay --help` shows all commands with descriptions
- [x] `relay create` validates required args (objective, contact, todos)
- [x] Human-readable output formatting
- [x] `--json` flag works on `relay status`
- [x] `tsc --noEmit` passes
- [x] Operation verified: L1 (Functional Operation -- `relay --help` works, commands make HTTP calls)

## Notes
- Impact scope: Replaces existing `src/index.ts`, creates new `src/commands/` directory
- Constraints: Use Commander.js (per ADR-005); use Node.js built-in `fetch` for HTTP calls
- `start` and `stop` commands use lifecycle.ts directly (not HTTP)
- All other commands require daemon running (HTTP calls)
- ESM: All imports use `.js` extension
