# Task 2.2: Message Handler -- Route Incoming Messages to Correct Instances

Metadata:
- Dependencies: Task 2.1 (WhatsApp connection with onMessage callback)
- Provides: `apps/cli/src/whatsapp/handler.ts`
- Size: Small (1 file)

## Implementation Content
Create the incoming message handler that routes WhatsApp messages to the correct conversation instance. When a message arrives, it looks up the active instance for the sender's phone number, appends the message to the transcript, and triggers the `contact_replies` state transition.

Reference: Design Doc "Component 6: Message Handler", "Incoming WhatsApp Message Handling" sequence diagram.

## Target Files
- [x] `apps/cli/src/whatsapp/handler.ts` (create)

## Implementation Steps

### 1. Create whatsapp/handler.ts
- [x] Import InstanceStore, TranscriptStore, state machine
- [x] Implement `createMessageHandler(deps)` factory function accepting dependencies:
  - `instanceStore`: for looking up active instances
  - `transcriptStore`: for recording messages
  - `stateMachine`: for triggering transitions
  - Returns the callback function to register with WhatsApp `onMessage`

### 2. Implement message routing logic
- [x] Extract sender phone number from incoming Baileys message
  - Strip `@s.whatsapp.net` suffix to get phone number
  - Prepend `+` for international format matching
- [x] Call `instanceStore.getActiveForContact(phone)` to find active instance
- [x] If no active instance found:
  - Log at debug level: "No active instance for contact {phone}, ignoring message"
  - Return (no action)
- [x] If active instance found:
  - Append message to transcript: `{ instance_id, role: 'contact', content: messageText, timestamp }`
  - Trigger state machine transition: `contact_replies` on the instance
  - Log at info level: "Incoming message routed to instance {id}"

### 3. Handle message types
- [x] Only process text messages (ignore media, stickers, etc. for v1)
- [x] Ignore messages sent by self (outgoing messages that echo back)
- [x] Ignore group messages (only process 1:1 chats)

### 4. Verify
- [x] Run `tsc --noEmit` -- must pass

## Completion Criteria
- [x] Message handler correctly looks up active instance by sender phone
- [x] Messages appended to transcript with role `contact`
- [x] State transition `contact_replies` triggered on matching instance
- [x] Messages with no matching instance are logged and ignored
- [x] Self-sent messages and group messages are filtered out
- [x] `tsc --noEmit` passes
- [x] Operation verified: L3 (Build Success -- L1 requires live WhatsApp, tested in Phase 2 completion)

## Notes
- Impact scope: New file `apps/cli/src/whatsapp/handler.ts`
- Constraints: Only handle text messages in v1
- Phone format: Baileys uses `1234567890@s.whatsapp.net`, storage uses `+1234567890`
- Use dependency injection pattern for testability
