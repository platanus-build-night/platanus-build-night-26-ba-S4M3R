# Task 1.1: Project Setup -- Rename Package, Update Bin, Install Dependencies

Metadata:
- Dependencies: None (first task)
- Size: Small (1-2 files)

## Implementation Content
Rename the CLI package from `@cape-town/cli` to `relay-agent`, change the binary from `cape-town` to `relay`, install all production and dev dependencies, and remove the chalk dependency. This establishes the foundation for all subsequent tasks.

Reference: Design Doc "Existing Codebase Analysis" section and Work Plan Task 1.1.

## Target Files
- [x] `apps/cli/package.json` (modify)
- [x] `apps/cli/src/index.ts` (verify placeholder still compiles after changes)

## Implementation Steps

### 1. Update package.json
- [x] Change `"name"` from `"@cape-town/cli"` to `"relay-agent"`
- [x] Change `"bin"` from `{ "cape-town": "./dist/index.js" }` to `{ "relay": "./dist/index.js" }`
- [x] Remove `"chalk"` from `dependencies`
- [x] Add production dependencies:
  - `"commander": "^12"` (CLI framework)
  - `"@whiskeysockets/baileys": "7.0.0-rc.9"` (exact version, no caret)
  - `"lowdb": "^7"` (JSON file database)
  - `"pino": "^9"` (structured logger)
  - `"pino-pretty": "^11"` (log formatting)
  - `"@mariozechner/pi-coding-agent": "*"` (agent SDK -- verify correct package name on npm)
  - `"uuid": "^9"` (UUID generation)
- [x] Add dev dependencies:
  - `"@types/uuid": "^9"`
- [x] Verify `"type": "module"` is present

### 2. Install and Verify
- [x] Run `npm install` from workspace root (or `npm install -w apps/cli`)
- [x] Run `tsc --noEmit -p apps/cli/tsconfig.json` -- must pass
- [x] Temporarily update `src/index.ts` to remove chalk import if needed (replace with simple console.log placeholder)

### 3. Verify TypeScript Config
- [x] Confirm `apps/cli/tsconfig.json` has `"strict": true`, `"target": "ES2022"`, `"module": "NodeNext"`, `"moduleResolution": "NodeNext"`

## Completion Criteria
- [x] `npm install` succeeds without errors
- [x] `tsc --noEmit` passes with zero errors
- [x] `package.json` reflects new name (`relay-agent`), new bin (`relay`), all new dependencies, no chalk
- [x] `"type": "module"` preserved
- [x] Operation verified: L3 (Build Success Verification)

## Notes
- Impact scope: `apps/cli/package.json` only; no other workspace affected
- Constraints: Do not modify `apps/web/` or root `package.json`
- ESM requirement: Ensure `"type": "module"` is not removed
- Baileys must be pinned to exact version `7.0.0-rc.9` per ADR-001
