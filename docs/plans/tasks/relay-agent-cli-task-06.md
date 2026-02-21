# Task 1.6: Daemon HTTP Server -- Node.js HTTP Server with All Routes

Metadata:
- Dependencies: Task 1.4 (storage layer), Task 1.5 (state machine)
- Provides: `apps/cli/src/daemon/server.ts`, `apps/cli/src/daemon/routes.ts`
- Size: Small (2 files)

## Implementation Content
Create the HTTP server using Node.js built-in `http` module, bound to `127.0.0.1:3214`. Implement all 10 API routes with JSON request/response handling. Routes are wired to the storage layer and state machine for real data operations.

Reference: Design Doc "API Routes" section, "Component 3: Daemon Server".

## Target Files
- [x] `apps/cli/src/daemon/server.ts` (create)
- [x] `apps/cli/src/daemon/routes.ts` (create)

## Implementation Steps

### 1. Create daemon/server.ts -- HTTP server
- [x] Import Node.js `http` module
- [x] Create server bound to `127.0.0.1:3214`
- [x] JSON body parser for POST requests (read request body, `JSON.parse`)
- [x] Route incoming requests to route handlers
- [x] Set `Content-Type: application/json` on all responses
- [x] Export `startServer()` and `stopServer()` functions
- [x] Track server start time for uptime calculation

### 2. Create daemon/routes.ts -- Route handlers
Implement all 10 routes:

- [x] `POST /init` -- Save config (model_api_key, model_provider), return `{ whatsapp_qr_displayed: false }` (WhatsApp wiring in Phase 2)
- [x] `GET /status` -- Return `DaemonStatusResponse` with pid, uptime_seconds, whatsapp_connected (false initially), active/total instance counts
- [x] `POST /instances` -- Validate `CreateInstanceRequest`, create `ConversationInstance` via InstanceStore, generate UUID for each todo item, apply heartbeat defaults (interval_ms: 1800000, max_followups: 5), return `CreateInstanceResponse`
- [x] `GET /instances` -- Return all instances from InstanceStore
- [x] `GET /instances/:id` -- Return single instance or 404
- [x] `GET /instances/:id/transcript` -- Return transcript messages for instance or 404
- [x] `POST /instances/:id/cancel` -- Trigger `cancel` event on state machine, return updated instance or 409 if invalid transition
- [x] `POST /instances/:id/pause` -- Trigger `pause` event on state machine, return updated instance or 409
- [x] `POST /instances/:id/resume` -- Trigger `resume` event on state machine, return updated instance or 409
- [x] `POST /instances/:id/send` -- Validate `SendMessageRequest`, append to transcript as `manual` role, return transcript message (WhatsApp delivery wired in Phase 2)

### 3. URL parsing for :id parameter
- [x] Parse URL path to extract instance ID from `/instances/:id` pattern
- [x] Use `URL` constructor or string parsing (no external router library)

### 4. Error response handling
- [x] 400 for missing required fields
- [x] 404 for instance not found
- [x] 409 for invalid state transitions (include current state and attempted event in error)
- [x] 500 for unexpected errors

### 5. Verify
- [x] Run `tsc --noEmit` -- must pass
- [x] Manual test: start server, `curl http://localhost:3214/status` returns valid JSON

## Completion Criteria
- [x] HTTP server binds to `127.0.0.1:3214`
- [x] All 10 routes respond with correct JSON and HTTP status codes
- [x] `POST /instances` creates real instances in storage
- [x] `POST /instances/:id/cancel|pause|resume` trigger state machine transitions
- [x] Error responses use correct HTTP status codes (400, 404, 409, 500)
- [x] `tsc --noEmit` passes
- [x] Operation verified: L1 (Functional Operation -- `curl /status` returns valid response)

## Notes
- Impact scope: New files in `apps/cli/src/daemon/`
- Constraints: Use Node.js built-in `http` module only (no Express, no Koa) per ADR-004
- WhatsApp integration not wired yet (POST /init returns placeholder, POST /send records but doesn't deliver)
- Server must bind to `127.0.0.1` only (security requirement from Design Doc)
