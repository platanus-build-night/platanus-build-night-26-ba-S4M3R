# Task 2.3: Wire WhatsApp to Daemon -- Connect Send/Receive to Daemon Lifecycle

Metadata:
- Dependencies: Task 2.1 (WhatsApp connection), Task 2.2 (message handler), Task 1.6 (daemon server/routes)
- Size: Small (2 files modified)

## Implementation Content
Integrate the WhatsApp connection manager and message handler into the daemon lifecycle. Wire the `POST /init` route to trigger WhatsApp connection and QR display, wire `POST /instances/:id/send` to deliver messages via Baileys, update `GET /status` with real connection state, and register the message handler on daemon startup.

Reference: Design Doc "Integration Point 2: Daemon -> WhatsApp", Work Plan Task 2.3.

## Target Files
- [x] `apps/cli/src/daemon/entry.ts` (modify -- add WhatsApp initialization)
- [x] `apps/cli/src/daemon/routes.ts` (modify -- wire WhatsApp to routes)

## Implementation Steps

### 1. Modify daemon/entry.ts
- [x] Import WhatsApp connection manager and message handler
- [x] On daemon startup: if auth state exists in `.relay-agent/whatsapp-auth/`, auto-connect WhatsApp
- [x] Register message handler callback on WhatsApp connection
- [x] On daemon shutdown: disconnect WhatsApp gracefully

### 2. Modify routes -- POST /init
- [x] Save config (model_api_key, model_provider) to ConfigStore
- [x] Trigger `connectWhatsApp()` to initiate QR code display
- [x] Return `{ whatsapp_qr_displayed: true }` when QR event fires

### 3. Modify routes -- POST /instances/:id/send
- [x] After recording transcript message, also send via WhatsApp:
  - Get instance's `target_contact`
  - Convert to JID with `phoneToJid()`
  - Call `sendMessage(jid, messageText)`
- [x] Handle WhatsApp not connected: return error if not connected

### 4. Modify routes -- GET /status
- [x] Replace hardcoded `whatsapp_connected: false` with real `getConnectionState() === 'connected'`

### 5. Register message handler
- [x] On WhatsApp connection established, register the message handler via `onMessage()`
- [x] Handler receives incoming messages and routes to instances (Task 2.2 logic)

### 6. Verify
- [x] Run `tsc --noEmit` -- must pass
- [ ] Manual verification with WhatsApp account (documented in Phase 2 completion)

## Completion Criteria
- [x] `relay init` triggers WhatsApp connection and QR code display
- [x] `relay send` delivers messages via WhatsApp
- [x] `relay status` shows real WhatsApp connection state
- [x] Incoming WhatsApp messages routed to instances via message handler
- [x] Auto-reconnect on daemon restart if auth state exists
- [x] `tsc --noEmit` passes
- [x] Operation verified: L3 (Build Success -- L1 requires live WhatsApp)

## Notes
- Impact scope: Modifies `entry.ts` and `routes.ts` (both created in Phase 1)
- Constraints: WhatsApp connection runs in daemon process only
- Must read existing files before modifying
