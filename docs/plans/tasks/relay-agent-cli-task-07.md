# Task 1.7: Daemon Lifecycle -- PID File Management, Start/Stop

Metadata:
- Dependencies: Task 1.6 (daemon HTTP server)
- Provides: `apps/cli/src/daemon/lifecycle.ts`, `apps/cli/src/daemon/entry.ts`
- Size: Small (2 files)

## Implementation Content
Implement daemon process spawning, PID file management, and start/stop lifecycle. The daemon runs as a detached background Node.js process. The entry point imports the server and starts listening.

Reference: Design Doc "Component 4: Daemon Lifecycle" and Work Plan Task 1.7.

## Target Files
- [x] `apps/cli/src/daemon/lifecycle.ts` (create)
- [x] `apps/cli/src/daemon/entry.ts` (create)

## Implementation Steps

### 1. Create daemon/entry.ts -- daemon process entry point
- [x] Import and call `initStores()` from store
- [x] Import and call `startServer()` from server
- [x] Log daemon start with PID
- [x] This file is the target for `child_process.fork()` or `spawn()`

### 2. Create daemon/lifecycle.ts -- lifecycle management
- [x] Implement `startDaemon(): Promise<void>`
  - Check if daemon is already running (via `isDaemonRunning()`)
  - If running, display "Daemon already running (PID: X)" and return
  - Spawn detached Node.js process running `entry.ts` (compiled to `dist/daemon/entry.js`)
  - Use `child_process.spawn` with `{ detached: true, stdio: 'ignore' }` and `unref()`
  - Write PID to `.relay-agent/daemon.pid`
  - Wait briefly and verify server responds on port 3214 (poll with timeout)
  - On success, log "Daemon started (PID: X)"

- [x] Implement `stopDaemon(): Promise<void>`
  - Check if daemon is running
  - Read PID from `.relay-agent/daemon.pid`
  - Send `SIGTERM` to process
  - Wait for process to exit (poll with timeout)
  - Remove PID file
  - Log "Daemon stopped"

- [x] Implement `isDaemonRunning(): boolean`
  - Check if `.relay-agent/daemon.pid` file exists
  - Read PID and check if process is alive (`process.kill(pid, 0)` in try/catch)
  - Handle stale PID file: if file exists but process not running, remove stale file and return false

- [x] Implement `getDaemonPid(): number | null`
  - Read PID from file, return null if not found

### 3. Handle edge cases
- [x] Stale PID files (process not running but PID file exists)
- [x] Port conflict: if server doesn't respond after spawn, display clear error
- [x] Create `.relay-agent/` directory if not exists

### 4. Verify
- [x] Run `tsc --noEmit` -- must pass
- [ ] Manual test: call `startDaemon()`, verify PID file created and server responds
- [ ] Manual test: call `stopDaemon()`, verify PID file removed and server stops

## Completion Criteria
- [x] `startDaemon()` spawns detached background process on port 3214
- [x] `stopDaemon()` terminates daemon and removes PID file
- [x] `isDaemonRunning()` correctly detects running/stopped/stale states
- [x] Stale PID file detection works (removes stale file)
- [x] Port 3214 in use shows clear error message
- [x] `tsc --noEmit` passes
- [ ] Operation verified: L1 (Functional Operation -- daemon starts and stops correctly)

## Notes
- Impact scope: New files in `apps/cli/src/daemon/`
- Constraints: Daemon must run as detached process (survives CLI exit)
- The entry point runs the compiled JS (`dist/daemon/entry.js`), so build must succeed first
- Consider using `tsx` for development (already a dev dependency)
