# Overall Design Document: Relay Agent CLI Implementation

Generation Date: 2026-02-20
Target Plan Document: work-plan.md

## Project Overview

### Purpose and Goals
Build a complete Relay Agent CLI system from the existing scaffold in `apps/cli/`. The system is a client-daemon architecture that mediates conversations between a high-privilege AI agent ("Main Agent") and real-world humans via WhatsApp. It includes a background daemon with HTTP API, WhatsApp integration via Baileys v7, an 11-state conversation FSM, pi-mono agent sessions, heartbeat follow-up timers, and a full CLI interface with 12 subcommands.

### Background and Context
The current `apps/cli/` contains only a placeholder "hello world" CLI with chalk as its sole dependency. The package is named `@cape-town/cli` with a `cape-town` binary. Everything must be built from scratch.

## Task Division Design

### Division Policy
Tasks are divided following the work plan's 19-task structure across 4 phases. The approach is **Vertical Slice with foundational dependencies first** -- storage, state machine, and daemon form a horizontal foundation (Phase 1), then vertical feature slices build on top (Phases 2-4).

- Verification levels: Phase 1 tasks mostly L3 (build success) with L1 for daemon lifecycle; Phase 2-3 tasks target L1 (functional operation); Phase 4 is L1 (full E2E).

### Inter-task Relationship Map
```
Phase 1: Foundation
  Task 1.1: Project setup         -> Deliverable: updated package.json, tsconfig verified
    |
    +-> Task 1.2: Data models     -> Deliverable: apps/cli/src/types.ts
    +-> Task 1.3: Logger          -> Deliverable: apps/cli/src/utils/logger.ts
          |
          v
  Task 1.4: Local JSON store     -> Deliverable: apps/cli/src/store/*.ts
    |
    +-> Task 1.5: State machine   -> Deliverable: apps/cli/src/engine/state-machine.ts
    +-> Task 1.6: Daemon HTTP     -> Deliverable: apps/cli/src/daemon/server.ts, routes.ts
          |
          v
  Task 1.7: Daemon lifecycle     -> Deliverable: apps/cli/src/daemon/lifecycle.ts, entry.ts
    |
    v
  Task 1.8: CLI commands         -> Deliverable: apps/cli/src/commands/*.ts, src/index.ts

Phase 2: WhatsApp Integration
  Task 2.1: WhatsApp connection   -> Deliverable: apps/cli/src/whatsapp/connection.ts
    |
    v
  Task 2.2: Message handler       -> Deliverable: apps/cli/src/whatsapp/handler.ts
    |
    v
  Task 2.3: Wire WhatsApp         -> Deliverable: integrated daemon + WhatsApp

Phase 3: Agent + Engine
  Task 3.1: Agent tools           -> Deliverable: apps/cli/src/agent/tools.ts
    |
    v
  Task 3.2: Agent session manager -> Deliverable: apps/cli/src/agent/session.ts
    |
    +-> Task 3.3: Heartbeat       -> Deliverable: apps/cli/src/engine/heartbeat.ts
    +-> Task 3.4: Queue           -> Deliverable: apps/cli/src/engine/queue.ts
          |
          v
  Task 3.5: Wire agent to flow   -> Deliverable: integrated conversation loop

Phase 4: Integration + Polish
  Task 4.1: Full lifecycle integration
    |
    v
  Task 4.2: Error handling
    |
    v
  Task 4.3: Graceful shutdown
```

### Interface Change Impact Analysis
| Existing Interface | New Interface | Conversion Required | Corresponding Task |
|-------------------|---------------|-------------------|-------------------|
| `@cape-town/cli` package | `relay-agent` package | Yes (rename) | Task 1.1 |
| `cape-town` binary | `relay` binary | Yes (rename) | Task 1.1 |
| Placeholder `index.ts` | Commander.js entry | Yes (replace) | Task 1.8 |
| chalk dependency | pino logger | Yes (replace) | Task 1.1, 1.3 |

### Common Processing Points
- **Types** (`src/types.ts`): All tasks reference shared type definitions from Task 1.2
- **Logger** (`src/utils/logger.ts`): Used across all components from Task 1.3 onward
- **Storage layer** (`src/store/`): Referenced by state machine, daemon routes, agent tools, heartbeat, queue
- **State machine** (`src/engine/state-machine.ts`): Referenced by daemon routes, message handler, agent, heartbeat, queue

## Implementation Considerations

### Principles to Maintain Throughout
1. ESM-only: All imports must use `.js` extension for NodeNext module resolution
2. TypeScript strict mode: No `any` types, explicit return types
3. Single daemon process: Daemon is sole writer to lowdb; CLI reads only through HTTP API
4. Loopback only: HTTP server bound to 127.0.0.1

### Risks and Countermeasures
- Risk: Baileys v7 RC instability
  Countermeasure: Pin exact version `7.0.0-rc.9`, wrap behind abstraction layer
- Risk: Race conditions between messages and heartbeat timers
  Countermeasure: Serialize all events per instance through state machine
- Risk: pi-mono session reconstruction on restart
  Countermeasure: Persist full transcripts, reconstruct from objective + todos + history

### Impact Scope Management
- Allowed change scope: `apps/cli/` only
- No-change areas: `apps/web/`, root `package.json` workspace config
