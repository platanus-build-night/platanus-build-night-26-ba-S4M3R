# Task 005: Features Section and SecurityModel Section

## Overview
Create the Features section (grid of GlassCards with CLI examples) and SecurityModel section (hard constraints list + structured data bridge JSON).

## Certainty
High -- server components with static data.

## Dependencies
- Task 002 (GlassCard, TerminalBlock)
- Task 003 (CodeExample)

## Target Files

### New Files
1. `apps/web/src/components/landing/features.tsx`
2. `apps/web/src/components/landing/security-model.tsx`

## Implementation Steps

### Step 1: Create Features section
Create `apps/web/src/components/landing/features.tsx`:
```tsx
import { GlassCard } from "@/components/ui/glass-card";
import { CodeExample } from "@/components/landing/code-example";

const FEATURES = [
  {
    name: "Interviews",
    description: "Conduct structured conversations with users through any channel.",
    lines: [
      { prefix: "$", text: "relay interview start --objective=\"gather feedback\"" },
      { prefix: ">", text: "session started. relay is collecting responses." },
    ],
  },
  {
    name: "Group Interviews",
    description: "Run parallel conversations with multiple participants simultaneously.",
    lines: [
      { prefix: "$", text: "relay interview start --group --participants=10" },
      { prefix: ">", text: "10 sessions initiated. responses aggregating." },
    ],
  },
  {
    name: "Pull Command",
    description: "Retrieve structured data from completed sessions as JSON.",
    lines: [
      { prefix: "$", text: "relay pull --session=abc123 --format=json" },
      { prefix: ">", text: "{ \"responses\": [...], \"summary\": \"...\" }" },
    ],
  },
  {
    name: "Logging",
    description: "Full audit trail of every relay interaction, queryable and exportable.",
    lines: [
      { prefix: "$", text: "relay logs --session=abc123 --tail" },
      { prefix: ">", text: "[2026-02-20T10:00:00Z] user responded to q1" },
    ],
  },
];

export function Features() {
  return (
    <section className="px-6 py-16">
      <h2 className="text-2xl font-mono font-bold text-foreground mb-8 text-center">
        What relay does
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
        {FEATURES.map((feature) => (
          <GlassCard key={feature.name}>
            <h3 className="text-lg font-bold text-foreground mb-2">{feature.name}</h3>
            <p className="text-muted text-sm mb-4">{feature.description}</p>
            <CodeExample lines={feature.lines} />
          </GlassCard>
        ))}
      </div>
    </section>
  );
}
```

### Step 2: Create SecurityModel section
Create `apps/web/src/components/landing/security-model.tsx`:
```tsx
import { GlassCard } from "@/components/ui/glass-card";
import { TerminalBlock } from "@/components/ui/terminal-block";

const CONSTRAINTS = [
  "No file system access",
  "No code execution",
  "No internal API access",
  "No role escalation",
];

const SCHEMA_LINES = [
  { prefix: "{", text: "" },
  { prefix: " ", text: "\"session_id\": \"abc123\"," },
  { prefix: " ", text: "\"objective\": \"gather user feedback\"," },
  { prefix: " ", text: "\"responses\": [" },
  { prefix: " ", text: "  { \"question\": \"...\", \"answer\": \"...\" }" },
  { prefix: " ", text: "]," },
  { prefix: " ", text: "\"summary\": \"...\"" },
  { prefix: "}", text: "" },
];

export function SecurityModel() {
  return (
    <section className="px-6 py-16">
      <h2 className="text-2xl font-mono font-bold text-foreground mb-8 text-center">
        Security model
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
        <GlassCard>
          <h3 className="text-lg font-bold text-foreground mb-4">Hard constraints</h3>
          <ul className="space-y-2">
            {CONSTRAINTS.map((constraint) => (
              <li key={constraint} className="flex items-start gap-2 text-muted text-sm">
                <span className="text-accent select-none">--</span>
                <span>{constraint}</span>
              </li>
            ))}
          </ul>
        </GlassCard>
        <GlassCard>
          <h3 className="text-lg font-bold text-foreground mb-4">Structured data bridge</h3>
          <TerminalBlock lines={SCHEMA_LINES} />
        </GlassCard>
      </div>
    </section>
  );
}
```

## Acceptance Criteria
- [ ] Features section renders 4 GlassCards in a responsive grid
- [ ] Each feature card shows name, description, and CLI code example
- [ ] SecurityModel section renders hard constraints list and JSON schema
- [ ] Both sections use GlassCard and TerminalBlock components
- [ ] `npm run build -w apps/web` succeeds (L3)

## Verification
```bash
npm run build -w apps/web  # Must succeed
```
