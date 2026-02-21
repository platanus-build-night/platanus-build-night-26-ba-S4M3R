# relay — setup guide

Get relay running on your machine and have your first AI-powered conversation in under 5 minutes.

relay is a CLI agent that handles conversations with real humans over WhatsApp, Telegram, and phone calls — so your main agent doesn't have to.

---

## 1. Install

```bash
npm install -g relay-agent@latest
```

Requires Node.js 18+.

---

## 2. Set your identity

Tell relay which model provider to use for agent sessions. You need an API key from [Anthropic](https://console.anthropic.com/) or [OpenAI](https://platform.openai.com/).

**Interactive (recommended):**

```bash
relay init
```

The wizard prompts you for your API key and provider.

**Or pass it directly:**

```bash
relay init --api-key sk-ant-api03-... --provider anthropic
```

```bash
relay init --api-key sk-... --provider openai
```

Your credentials are saved locally in `.relay-agent/config.json`. They never leave your machine.

---

## 3. Connect a channel

relay needs at least one channel to talk to humans. Pick the one that fits your use case — or set up all three.

### Option A: WhatsApp

Scan a QR code to link your WhatsApp account:

```bash
relay whatsapp login
```

A QR code appears in your terminal. Open WhatsApp on your phone, go to **Linked Devices**, tap **Link a Device**, and scan the code.

If the QR is hard to scan in the terminal, use browser mode:

```bash
relay whatsapp login --browser
```

This opens a clean QR page at `http://127.0.0.1:8787`.

Verify it worked:

```bash
relay whatsapp status
```

Auth state is saved in `.relay-agent/whatsapp-auth/` and reconnects automatically.

### Option B: Telegram

You need a bot token from [@BotFather](https://t.me/BotFather) on Telegram.

1. Open Telegram, search for `@BotFather`, send `/newbot`
2. Follow the prompts to name your bot
3. Copy the token you receive

Then connect it:

```bash
relay telegram login --token <YOUR_BOT_TOKEN>
```

Verify it worked:

```bash
relay telegram status
```

The token is saved locally in `.relay-agent/telegram-auth/`.

### Option C: Phone calls (ElevenLabs)

For outbound voice calls via ElevenLabs Conversational AI + Twilio.

**Prerequisites:**
- An [ElevenLabs](https://elevenlabs.io) account with Conversational AI enabled
- A Twilio phone number connected to your ElevenLabs account

Set your API key:

```bash
export ELEVENLABS_API_KEY=your-key-here
```

No login command needed — the key is used directly when creating calls.

---

## 4. Start the daemon

relay runs as a background daemon that manages all connections and conversation state:

```bash
relay start
```

The daemon listens on `localhost:3214`. All CLI commands talk to it via HTTP. Check everything is running:

```bash
relay status
```

This shows the daemon PID, uptime, connected channels, and active instance counts.

---

## 5. Create your first conversation

Now the fun part. Create a conversation and let the agent handle it.

### WhatsApp conversation

```bash
relay create \
  --contact="+56912345678" \
  --objective="Confirm delivery time for order #4421" \
  --todos="ask preferred delivery window,confirm shipping address,get recipient name"
```

### Telegram conversation

```bash
relay create \
  --contact="+56912345678" \
  --objective="Confirm delivery time for order #4421" \
  --todos="ask preferred delivery window,confirm shipping address" \
  --channel=telegram
```

The contact must message your bot on Telegram first. Once they do, relay maps them to the instance automatically.

### Phone call

```bash
relay create \
  --contact="+56912345678" \
  --objective="Confirm delivery time for order #4421" \
  --todos="ask preferred delivery window,confirm shipping address" \
  --channel=phone \
  --phone-number-id=PN123abc \
  --first-message="Hi, I'm calling from Acme Co about your delivery."
```

For a quick standalone call without instance tracking:

```bash
relay call "+56912345678" \
  --phone-number-id=PN123abc \
  --prompt="Confirm the delivery window for order #4421" \
  --first-message="Hi, calling about your recent order."
```

Each `create` command returns an **instance ID** — save it to monitor and control the conversation.

---

## 6. Monitor and control

**Check on a conversation:**

```bash
relay get <instance-id>
```

**List all conversations:**

```bash
relay list
```

**Read the full transcript:**

```bash
relay transcript <instance-id>
```

**Pause, resume, or cancel:**

```bash
relay pause <instance-id>
relay resume <instance-id>
relay cancel <instance-id>
```

**Inject a manual message:**

```bash
relay send <instance-id> "Sorry for the delay, checking now"
```

---

## 7. Stop the daemon

When you're done:

```bash
relay stop
```

All state is flushed to disk and persists for the next session.

---

## How it works

relay is a **client-daemon pair**:

```
Your Agent (full privileges)
    |
    |  CLI commands (relay create, relay send, relay call, ...)
    v
relay daemon (localhost:3214)
    |  conversation-scoped tools only
    |
    |-- WhatsApp (Baileys)
    |-- Telegram (grammY bot)
    |-- Phone (ElevenLabs + Twilio)
    v
Human contacts
```

The agent driving each conversation has access to these tools:

- **send_message** — Send a message to the contact
- **mark_todo_item** — Update a todo's status (pending/in_progress/completed/skipped)
- **end_conversation** — Mark the conversation as completed
- **request_human_intervention** — Escalate when the agent is stuck
- **schedule_next_heartbeat** — Override the follow-up timer
- **escalate_to_call** — Switch from text to a voice call mid-conversation

The agent can't access your filesystem, run code, or call APIs. It can only talk.

---

## Key concepts

- **Objective** — What the conversation should achieve. The agent uses this as its north star.
- **Todos** — A checklist of items the agent works through. Track progress via `relay get`.
- **Heartbeat** — If the contact goes silent, relay follows up automatically (default: every 30 min, max 5 times). Customize with `--heartbeat-interval` and `--max-followups`.
- **Channels** — WhatsApp (default), Telegram, or phone. Set with `--channel`.
- **State machine** — Each conversation moves through defined states: CREATED, ACTIVE, WAITING_FOR_REPLY, COMPLETED, and more. You always know where things stand.

---

## Quick reference

```bash
# Setup
npm install -g relay-agent@latest
relay init
relay whatsapp login
relay telegram login --token <token>
relay start

# Conversations
relay create --contact="..." --objective="..." --todos="..."
relay list
relay get <id>
relay transcript <id>

# Control
relay pause <id>
relay resume <id>
relay cancel <id>
relay send <id> "message"

# Calls
relay call "+1234567890" --phone-number-id=... --prompt="..." --first-message="..."

# Daemon
relay start
relay stop
relay status
```

---

## Something broke?

relay is under active development. If you hit a bug or something doesn't work as expected, let me know on X: [@agustincto](https://x.com/agustincto)

Docs: [https://relay-agent.com](https://relay-agent.com) | npm: [relay-agent](https://www.npmjs.com/package/relay-agent)
