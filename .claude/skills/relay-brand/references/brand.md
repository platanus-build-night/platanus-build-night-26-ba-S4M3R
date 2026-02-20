# relay — Brand Reference

## Brand Core

**Name:** relay (always lowercase)
**One liner:** A privilege-isolated conversational agent for WhatsApp.
**Positioning:** A local CLI agent that mediates all communication between a high-privilege internal agent and real humans via WhatsApp, enforcing strict capability isolation.

## The Problem

Powerful agents have filesystem access, code execution, internal APIs, and secrets. When they need to talk to real humans via WhatsApp — to confirm deliveries, collect feedback, or validate information — you don't want that same agent exposed externally. You want: communication without capability leakage.

## The Solution

relay is a client-daemon pair. A persistent background daemon manages the WhatsApp connection (via Baileys v7) and conversation state. Lightweight CLI commands provide full observability and control. Your main agent orchestrates human conversations through shell commands while maintaining strict privilege isolation.

**Can:** WhatsApp messaging, structured conversations with objectives and todo lists, automatic heartbeat follow-ups, conversation state machine, persistent state across restarts.

**Cannot:** execute code, access filesystem, use dev tools, call internal APIs, escalate privileges.

Triggered only via CLI commands (`relay create`, `relay send`, etc.). Your powerful agent delegates — never talks directly to the outside world.

## Product Principles

1. **Capability Isolation** — Main Agent (full access) + Relay Agent (conversation-only). No shared execution context.
2. **API-First** — Everything programmable via CLI. No UI dependency. No hidden flows.
3. **Conversation as Execution Boundary** — relay collects, follows checklists, produces structured output. The main agent decides what to do with output.

## Features

- **Daemon Management**: `relay start` / `relay stop` — persistent background process
- **Conversation Instances**: `relay create --contact="+56912345678" --objective="confirm delivery" --heartbeat=30m`
- **State Machine**: CREATED → ACTIVE → WAITING_FOR_REPLY → COMPLETED (11 defined states)
- **Heartbeat System**: Automatic follow-ups for unresponsive contacts with configurable intervals
- **Full Observability**: `relay list`, `relay get <id>`, `relay transcript <id>`, `relay status`
- **Instance Control**: `relay pause`, `relay resume`, `relay cancel`, `relay send`
- **Concurrency Control**: One active instance per contact, additional instances queued (FIFO)

## Channels

- **WhatsApp (via Baileys v7)**: structured conversations, heartbeat follow-ups, objective-driven interactions

## Security Model

Hard constraints: no file access, no code execution, no internal APIs, no role escalation, no infrastructure modification.

Conversation-scoped tools only:
- `send_message(text)` — deliver via WhatsApp
- `mark_todo_item(todo_id, status)` — track progress
- `end_conversation(reason)` — close the instance
- `schedule_next_heartbeat(delay)` — set follow-up timer

## Visual Identity

### Overall Vibe: Dark Editorial Tech

relay looks like a technical tool with editorial craft — dark, glass-based, but with warmth and texture layered in. Not sterile Silicon Valley cold. Not Web3 neon chaos. A dark interface that feels human, tactile, and deliberately made.

**Combines:** dark glass panels + fine grain texture + halftone/dot-matrix graphic elements + monochrome UI with one warm accent color.

### Style
- Dark-first with warmth — near-black base with subtle warm undertones
- Glass panels (backdrop-blur, semi-transparent backgrounds) as primary surface treatment
- Fine grain / noise texture overlay on backgrounds — adds tactile, editorial depth
- Halftone / dot-matrix graphic elements (density gradients, controlled imperfection)
- Warm diffused glows layered behind glass — not flat, not sterile
- Terminal typography — monospace everywhere
- Minimal animations
- No glossy UI, no heavy drop shadows, no sharp saturated gradients

### Background Treatment
- Near-black base with subtle noise/grain texture across the canvas
- Warm, diffused glow behind key elements — muted amber/orange radial effects through dark glass
- Slight radial glow feels like: distant warmth, analog signal, airbrushed pigment on dark paper
- Grain avoids flat dark gradients — adds depth without traditional shadows
- Everything blends gently behind glass — calm confidence, craft over enterprise rigidity

### Graphic Elements
- Halftone / dot-matrix constructions for hero shapes and decorative elements
- Tiny uniform dots with density gradients (dense center → sparse edges)
- Inspired by: print halftone patterns, retro digital rendering, raster graphics
- Circles and geometric forms that feel computational but artistic — organic dissolve at edges
- Rendered in light/accent tones against dark backgrounds
- Symbolically: focus, central gravity, a core engine radiating outward

### Color Palette
- Background: near-black (#0a0a0a, #111) with subtle warm grain overlay
- Glass surfaces: rgba(255,255,255,0.05) to rgba(255,255,255,0.1) with backdrop-blur
- Primary text: white / light gray
- Secondary text: muted warm gray (#9A9590)
- Accent: warm muted amber (#C4713B) — used sparingly for interactive elements, links, highlights, halftone dots
- Accent glow: diffused warm amber (rgba(196, 113, 59, 0.10)) for radial background effects behind glass
- Borders: rgba(255,255,255,0.1)
- Halftone dots: white/light gray or accent amber, depending on context
- No bright saturated colors, no neon, no cold corporate blue

### Typography
- Monospace font stack: `"JetBrains Mono", "Fira Code", "SF Mono", "Cascadia Code", monospace`
- Clean, technical feel
- Terminal-like rendering

### Component Patterns
- Glass cards: semi-transparent bg + backdrop-blur + subtle border + fine grain texture
- Terminal inputs: `$` prefix, monospace, dark background
- Code blocks as primary content display
- Minimal, flat buttons — no glossy effects
- No rounded-full pills — prefer sharp or slightly rounded corners
- Air and space over density — generous padding and margins
- Soft contrast over hard dividers

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

Hero starts with a terminal prompt showing a `relay create` command:
```
> relay create \
>   --contact="+56912345678" \
>   --objective="confirm delivery time" \
>   --heartbeat=30m
```

Interactive input: `$ describe your objective...`

Response renders as structured CLI output showing a created conversation instance with state, heartbeat config, and isolation confirmation.
