# Task 1.3: Logger Utility -- Pino Setup

Metadata:
- Dependencies: Task 1.1 (pino + pino-pretty dependencies installed)
- Provides: `apps/cli/src/utils/logger.ts` (used by all subsequent tasks)
- Size: Small (1 file)

## Implementation Content
Create a Pino-based logger singleton that writes structured JSON logs. The logger is used throughout the entire system for state transition logging, error reporting, and debug output.

Reference: Design Doc "Logging and Monitoring" section.

## Target Files
- [x] `apps/cli/src/utils/logger.ts` (create)

## Implementation Steps

### 1. Create logger.ts
- [x] Import pino
- [x] Configure Pino with:
  - `name`: `'relay-agent'`
  - `level`: from `process.env.RELAY_LOG_LEVEL` or default `'info'`
  - `transport`: `pino-pretty` with `{ colorize: true }` for development
- [x] Configure log file output to `.relay-agent/relay.log` (destination stream)
- [x] Export singleton logger instance
- [x] Ensure the `.relay-agent/` directory is created if it does not exist (use `fs.mkdirSync` with `{ recursive: true }`)

### 2. Log Level Convention
Document in code comments:
- `error`: Unrecoverable errors, failed state transitions, WhatsApp disconnection failures
- `warn`: Invalid transition attempts, heartbeat timer discards, stale PID cleanup
- `info`: State transitions, instance creation/completion, daemon start/stop
- `debug`: Incoming/outgoing messages, agent tool calls, timer scheduling

### 3. Verify
- [x] Run `tsc --noEmit` -- must pass
- [x] Logger is importable and produces structured output

## Completion Criteria
- [x] `apps/cli/src/utils/logger.ts` exists with configured Pino logger
- [x] Logger respects `RELAY_LOG_LEVEL` environment variable
- [x] Logger writes to `.relay-agent/relay.log`
- [x] `tsc --noEmit` passes
- [x] Operation verified: L3 (Build Success Verification)

## Notes
- Impact scope: New file only
- Constraints: Must use Pino (per Design Doc), not chalk or console.log
- ESM import: Use `import pino from 'pino'` (ESM default import)
