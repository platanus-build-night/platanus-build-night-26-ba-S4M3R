# Overall Design Document: relay Landing Page and Documentation Site

Generation Date: 2026-02-20
Target Plan Document: docs/work-plan.md

## Project Overview

### Purpose and Goals
Build the relay web presence: a dark-first landing page with interactive terminal hero and a 3-page fumadocs documentation site, all within the existing `apps/web` monorepo workspace.

### Background and Context
The current `apps/web` contains only Next.js boilerplate. This plan implements the full landing page and docs site as specified in the Design Doc, following a vertical slice strategy ordered by technical dependencies.

## Task Division Design

### Division Policy
Tasks are divided by vertical slice with foundation-first ordering. Each task produces a commit-sized deliverable (1-5 files). The work plan's 5 phases map to 8 tasks, splitting Phase 3 (Landing Page) into multiple commits due to its size.

- Vertical slice for user-facing features (landing sections, docs pages)
- Foundation layer first (dependencies, tokens, config)
- Verifiability: L3 for foundation tasks, L1 for feature tasks

### Inter-task Relationship Map
```
Task 001: Foundation (deps, config, tokens, layout) -> Deliverable: modified globals.css, layout.tsx, next.config.ts, source.config.ts, package.json, tsconfig.json
  |
Task 002: UI Primitives (GlassCard, TerminalBlock) -> Deliverable: glass-card.tsx, terminal-block.tsx
  |
Task 003: Layout + CodeExample (Header, Footer, CodeExample) -> Deliverable: header.tsx, footer.tsx, code-example.tsx
  |
Task 004: Hero Component (client, animation) -> Deliverable: hero.tsx
  |
Task 005: Features + SecurityModel sections -> Deliverable: features.tsx, security-model.tsx
  |
Task 006: Assemble Landing Page (page.tsx) -> Deliverable: page.tsx
  |
  +-- (parallel after Task 001) --+
  |                                |
Task 007: Docs Site (source, layout, page, MDX content) -> Deliverable: source.ts, docs layout, docs page, 3 MDX files, meta.json
  |                                |
  +--------------------------------+
  |
Task 008: Polish (responsive, reduced-motion, final QA) -> Deliverable: updates to hero.tsx, verification
```

### Common Processing Points
- GlassCard and TerminalBlock are shared between Features, SecurityModel, and CodeExample
- Brand tokens in globals.css are consumed by all components
- RootProvider in layout.tsx wraps both landing and docs routes

## Implementation Considerations

### Principles to Maintain Throughout
1. Dark-first design: all components use relay brand tokens (dark bg, monospace, muted palette)
2. No rounded-full: buttons and cards use sharp or slightly rounded corners
3. Server components by default; only Hero uses "use client"
4. No unit tests (static site, no business logic -- per Design Doc test strategy)

### Risks and Countermeasures
- Risk: fumadocs v16 incompatibility with Next.js 16
  Countermeasure: Validate during Task 001; fall back to @next/mdx if needed
- Risk: fumadocs CSS conflicts with relay brand tokens
  Countermeasure: Use CSS variable overrides (--color-fd-*) as specified in Design Doc

### Impact Scope Management
- Allowed change scope: all files within apps/web/
- No-change areas: apps/cli, root package.json structure, any other workspace
