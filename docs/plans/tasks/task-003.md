# Task 003: Layout Components and CodeExample -- Header, Footer, CodeExample

## Overview
Create the Header (site nav with relay logo and Docs link), Footer (copyright), and CodeExample (TerminalBlock wrapper) components.

## Certainty
High -- simple server components.

## Dependencies
- Task 002 (TerminalBlock is used by CodeExample)

## Target Files

### New Files
1. `apps/web/src/components/layout/header.tsx`
2. `apps/web/src/components/layout/footer.tsx`
3. `apps/web/src/components/landing/code-example.tsx`

## Implementation Steps

### Step 1: Create Header
Create `apps/web/src/components/layout/header.tsx`:
```tsx
import Link from "next/link";

export function Header() {
  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-glass-border">
      <Link href="/" className="text-foreground font-mono text-lg font-bold tracking-tight">
        relay
      </Link>
      <nav>
        <Link href="/docs" className="text-muted hover:text-foreground transition-colors font-mono text-sm">
          Docs
        </Link>
      </nav>
    </header>
  );
}
```

### Step 2: Create Footer
Create `apps/web/src/components/layout/footer.tsx`:
```tsx
export function Footer() {
  return (
    <footer className="border-t border-glass-border px-6 py-8 text-center text-muted text-sm font-mono">
      <p>Built with relay</p>
      <p className="mt-1">&copy; {new Date().getFullYear()} relay. All rights reserved.</p>
    </footer>
  );
}
```

### Step 3: Create CodeExample
Create `apps/web/src/components/landing/code-example.tsx`:
```tsx
import { TerminalBlock } from "@/components/ui/terminal-block";

export function CodeExample({
  lines,
  className,
}: {
  lines: Array<{ prefix: string; text: string }>;
  className?: string;
}) {
  return (
    <div className={`relative ${className ?? ""}`}>
      <TerminalBlock lines={lines} />
    </div>
  );
}
```

## Acceptance Criteria
- [ ] Header displays "relay" logo text and "Docs" link pointing to /docs
- [ ] Footer displays copyright line and "Built with relay" text
- [ ] CodeExample wraps TerminalBlock correctly
- [ ] `npm run build -w apps/web` succeeds (L3)
- [ ] No rounded-full styling used anywhere

## Verification
```bash
npm run build -w apps/web  # Must succeed
```
