---
name: relay-brand
description: >
  Brand guidelines and design system for "relay" — an external agent service
  with a glass + terminal aesthetic. Use when building UI, landing pages,
  components, CLI output, marketing copy, or any visual/textual content for
  the relay product. Triggers: "relay brand", "relay style", "relay design",
  building relay UI, writing relay copy, creating relay pages, styling relay
  components, or any task involving the relay product's visual identity or voice.
---

# relay Brand Skill

Apply these guidelines to all relay-related design and content work.

## Quick Reference

- **Name**: relay (always lowercase, never capitalized)
- **Aesthetic**: dark-first, glass panels, terminal/monospace typography
- **Tone**: technical, calm, precise — no hype, no fluff
- **Core concept**: communication without capability leakage

## Visual Defaults

```css
/* Backgrounds */
--bg-primary: #0a0a0a;
--bg-surface: rgba(255, 255, 255, 0.05);
--bg-surface-hover: rgba(255, 255, 255, 0.08);

/* Borders */
--border-subtle: rgba(255, 255, 255, 0.1);
--border-focus: rgba(255, 255, 255, 0.2);

/* Text */
--text-primary: rgba(255, 255, 255, 0.95);
--text-secondary: rgba(255, 255, 255, 0.6);
--text-muted: rgba(255, 255, 255, 0.4);

/* Glass effect */
backdrop-filter: blur(12px);
background: var(--bg-surface);
border: 1px solid var(--border-subtle);

/* Font stack */
font-family: "JetBrains Mono", "Fira Code", "SF Mono", monospace;
```

## Key Patterns

- Glass cards: semi-transparent bg + backdrop-blur + subtle border
- Terminal inputs: `$` prefix, monospace, dark background
- CLI-style output for feature demos
- Sharp or slightly rounded corners (no pill shapes)
- Minimal, purposeful animations only

## Copy Rules

- Use: isolated, bounded, delegated, controlled, restricted, structured
- Never use: revolutionary, AI-powered magic, next-gen, game-changing
- Write like documentation, not marketing

## Full Brand Reference

For complete brand details including product features, security model, channels, landing page patterns, and target audience, read [references/brand.md](references/brand.md).
