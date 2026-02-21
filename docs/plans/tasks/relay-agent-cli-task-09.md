# Task 2.1: WhatsApp Connection Manager -- Baileys Socket, QR Code, Auth State

Metadata:
- Dependencies: Task 1.6 (daemon server running), Task 1.4 (storage for auth state)
- Provides: `apps/cli/src/whatsapp/connection.ts`
- Size: Small (1 file)

## Implementation Content
Create the WhatsApp connection manager wrapping Baileys v7. This handles socket creation, QR code display, auth state persistence, message sending, connection state tracking, and reconnection with exponential backoff.

Reference: Design Doc "Component 5: WhatsApp Client", ADR-001.

## Target Files
- [x] `apps/cli/src/whatsapp/connection.ts` (create)

## Implementation Steps

### 1. Create whatsapp/connection.ts
- [x] Import `makeWASocket`, `useMultiFileAuthState`, `DisconnectReason` from `@whiskeysockets/baileys`
- [x] Implement `connectWhatsApp(): Promise<void>`
  - Call `useMultiFileAuthState('.relay-agent/whatsapp-auth/')` for auth persistence
  - Create Baileys socket with `makeWASocket({ auth: state, printQRInTerminal: true })`
  - Register `connection.update` event handler:
    - On `qr` event: QR code is auto-printed by Baileys (`printQRInTerminal: true`)
    - On `open`: Log connection established, update config `whatsapp_connected = true`
    - On `close`: Check `DisconnectReason`, trigger reconnection if transient
  - Register `creds.update` handler to save auth state
  - Store socket reference for sending messages

### 2. Implement reconnection with exponential backoff
- [x] Backoff delays: 1s, 2s, 4s, 8s, 16s, max 30s
- [x] Reset backoff counter on successful connection
- [x] After 5+ consecutive failures: log critical, set `whatsapp_connected = false`
- [x] On non-transient disconnect (e.g., logged out): do not reconnect, require re-init

### 3. Implement message sending
- [x] `sendMessage(jid: string, text: string): Promise<void>`
  - Use Baileys `sock.sendMessage(jid, { text })`
  - Throw if not connected

### 4. Implement utility functions
- [x] `getConnectionState(): 'connected' | 'connecting' | 'disconnected'`
- [x] `phoneToJid(phone: string): string` -- transform `+1234567890` to `1234567890@s.whatsapp.net` (strip leading `+`)
- [x] `disconnectWhatsApp(): Promise<void>` -- gracefully close socket

### 5. Implement message event callback registration
- [x] `onMessage(callback: (message) => void): void` -- register callback for Baileys `messages.upsert` event
- [x] Extract sender phone, message text, and timestamp from Baileys message objects

### 6. Verify
- [x] Run `tsc --noEmit` -- must pass
- [x] Manual verification requires actual WhatsApp account (documented in Phase 2 completion)

## Completion Criteria
- [x] `connectWhatsApp()` creates Baileys socket with QR code display
- [x] Auth state persisted in `.relay-agent/whatsapp-auth/`
- [x] `sendMessage()` sends text via Baileys socket
- [x] `getConnectionState()` returns accurate connection status
- [x] `phoneToJid()` correctly transforms phone numbers to JID format
- [x] Reconnection with exponential backoff (1s, 2s, 4s, 8s, 16s, max 30s)
- [x] `tsc --noEmit` passes
- [x] Operation verified: L3 (Build Success -- full L1 requires WhatsApp account, tested in Phase 2 completion)

## Notes
- Impact scope: New file `apps/cli/src/whatsapp/connection.ts`
- Constraints: Baileys v7.0.0-rc.9 exact version (per ADR-001)
- Wrap Baileys behind abstraction (Design Doc specifies interface for future swapability)
- Baileys is ESM-compatible but may need special import handling
- Phone to JID: strip `+` prefix, append `@s.whatsapp.net`
