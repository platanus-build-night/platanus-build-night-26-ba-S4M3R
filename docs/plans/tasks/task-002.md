# Task 002: UI Primitives -- GlassCard and TerminalBlock

## Overview
Create the two reusable UI primitive components (GlassCard and TerminalBlock) that are used across the landing page sections.

## Certainty
High -- simple server components with Tailwind styling.

## Dependencies
- Task 001 (brand tokens in globals.css must exist)

## Target Files

### New Files
1. `apps/web/src/components/ui/glass-card.tsx`
2. `apps/web/src/components/ui/terminal-block.tsx`

## Implementation Steps

### Step 1: Create GlassCard
Create `apps/web/src/components/ui/glass-card.tsx`:
```tsx
export function GlassCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-glass-bg border border-glass-border backdrop-blur-[12px] p-6 ${className ?? ""}`}>
      {children}
    </div>
  );
}
```

### Step 2: Create TerminalBlock
Create `apps/web/src/components/ui/terminal-block.tsx`:
```tsx
export function TerminalBlock({
  lines,
  className,
}: {
  lines: Array<{ prefix: string; text: string }>;
  className?: string;
}) {
  return (
    <div className={`bg-[#050505] border border-glass-border p-4 font-mono text-sm ${className ?? ""}`}>
      {lines.map((line, i) => (
        <div key={i} className="flex gap-2">
          <span className="text-muted select-none">{line.prefix}</span>
          <span className="text-foreground">{line.text}</span>
        </div>
      ))}
    </div>
  );
}
```

## Acceptance Criteria
- [ ] Both components export correctly and can be imported
- [ ] `npm run build -w apps/web` succeeds (L3)
- [ ] GlassCard applies bg-glass-bg, backdrop-blur, and border-glass-border classes
- [ ] TerminalBlock renders lines with prefix and text in monospace

## Verification
```bash
npm run build -w apps/web  # Must succeed
```
Optionally import both components in page.tsx with sample data to visually verify styling, then revert.
