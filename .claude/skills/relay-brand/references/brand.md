# relay — Brand Reference

## Brand Core

**Name:** relay (always lowercase)
**One liner:** A separate agent for talking with the real world.
**Positioning:** An external-facing conversational agent that isolates execution power from communication power.

## The Problem

Powerful agents have filesystem access, code execution, internal APIs, and secrets. When they need to talk to real humans (WhatsApp, voice, interviews, outreach), you don't want that same agent exposed externally. You want: communication without capability leakage.

## The Solution

relay is a restricted external agent.

**Can:** structured conversations, interviews, calls (ElevenLabs), WhatsApp messaging, scoped conversation memory, controlled shared context updates.

**Cannot:** execute code, access filesystem, use dev tools, call internal APIs, escalate privileges.

Triggered only via CLI, API, or another agent. Your powerful agent delegates — never talks directly to the outside world.

## Product Principles

1. **Capability Isolation** — Core Agent (full access) + Relay Agent (conversation-only). No shared execution context.
2. **API-First** — Everything programmable. No UI dependency. No hidden flows.
3. **Conversation as Execution Boundary** — relay collects, follows checklists, produces structured output, pushes logs. The core agent decides what to do with output.

## Features

- **Interviews**: `relay interview start --user-id=usr_8123 --objective="validate onboarding friction"`
- **Group Interviews**: `relay group-interview start --group-id=power_users --shared-context=product_feedback`
- **Internal Conversation To-Do**: Invisible checklist guiding agent during conversation
- **Pull Command**: `relay pull --conversation-id=cnv_4421` — returns structured JSON
- **Logging**: `relay logs --conversation-id=cnv_4421` — full auditability

## Channels

- **WhatsApp**: interviews, async follow-ups, user validation, customer research
- **Voice (ElevenLabs)**: outbound interviews, qualification calls, onboarding, research

## Security Model

Hard constraints: no file access, no code execution, no internal APIs, no role escalation, no infrastructure modification. Only talks, collects, summarizes, reports.

Structured data bridge between core agent and relay via strict schema:
```json
{
  "objective": "string",
  "constraints": [],
  "allowed_updates": ["shared_context"]
}
```

## Visual Identity

### Style
- Dark-first
- Glass panels (backdrop-blur, semi-transparent backgrounds)
- Terminal typography — monospace everywhere
- Minimal animations
- Subtle gradients

### Color Palette
- Background: near-black (#0a0a0a, #111)
- Glass surfaces: rgba(255,255,255,0.05) to rgba(255,255,255,0.1) with backdrop-blur
- Primary text: white/light gray
- Accent: subtle cool tones (muted blue/cyan for interactive elements)
- Borders: rgba(255,255,255,0.1)
- No bright saturated colors

### Typography
- Monospace font stack: `"JetBrains Mono", "Fira Code", "SF Mono", "Cascadia Code", monospace`
- Clean, technical feel
- Terminal-like rendering

### Component Patterns
- Glass cards: semi-transparent bg + backdrop-blur + subtle border
- Terminal inputs: `$` prefix, monospace, dark background
- Code blocks as primary content display
- Minimal, flat buttons
- No rounded-full pills — prefer sharp or slightly rounded corners

## Tone & Messaging

### Voice
- Technical, calm, controlled, precise
- No hype, no fluff
- Feels like: internal tool, secure system, command surface

### Do NOT say
- revolutionary, AI-powered magic, next-gen, game-changing, cutting-edge

### DO say
- isolated, bounded, delegated, controlled, restricted, structured

## Target User
- Technical founders
- Builders using agents
- People orchestrating LLM workflows
- Devs worried about security boundaries
- Teams doing AI-native systems

**NOT for:** no-code audience, marketing automation users, casual chatbot builders

## Landing Page Pattern

Hero starts with a terminal prompt:
```
> create an external agent
> that can talk to users
> without touching my system
```

Interactive input: `$ describe your use case...`

Response renders as structured CLI output showing what relay will do.
