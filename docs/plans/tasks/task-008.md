# Task 008: Polish -- Responsive Verification, Reduced Motion, Final QA

## Overview
Verify responsive behavior at all breakpoints, ensure prefers-reduced-motion works on the Hero, and run final build verification. Optionally add copy-to-clipboard to CodeExample if time permits.

## Certainty
High -- verification and minor adjustments.

## Dependencies
- Task 006 (landing page assembled)
- Task 007 (docs site complete)

## Target Files

### Potentially Modified Files
1. `apps/web/src/components/landing/hero.tsx` -- Ensure reduced-motion handling is correct
2. `apps/web/src/components/landing/code-example.tsx` -- Optional: add copy-to-clipboard button
3. Any component files needing responsive fixes

## Implementation Steps

### Step 1: Responsive verification
Run `npm run dev -w apps/web` and test at three viewports:
- 360px (mobile)
- 768px (tablet)
- 1280px+ (desktop)

Check:
- Landing page: Hero, Features grid, SecurityModel grid all render correctly
- Docs pages: Sidebar collapses on mobile, TOC visible on desktop
- No horizontal overflow at any breakpoint

Fix any layout issues found (add responsive Tailwind classes as needed).

### Step 2: Verify prefers-reduced-motion
In browser DevTools, enable "Prefers reduced motion" setting.
- Hero should show all 3 lines immediately without character-by-character animation
- Input field should be active immediately

If not working correctly, verify the Hero component's useEffect correctly checks `window.matchMedia("(prefers-reduced-motion: reduce)")`.

### Step 3: Optional -- Copy-to-clipboard on CodeExample
If time permits, add a copy button to `code-example.tsx`:
```tsx
"use client";

import { useState } from "react";
import { TerminalBlock } from "@/components/ui/terminal-block";

export function CodeExample({
  lines,
  className,
}: {
  lines: Array<{ prefix: string; text: string }>;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const text = lines.map((l) => `${l.prefix} ${l.text}`).join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`relative group ${className ?? ""}`}>
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 text-muted hover:text-foreground text-xs font-mono opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {copied ? "copied" : "copy"}
      </button>
      <TerminalBlock lines={lines} />
    </div>
  );
}
```

NOTE: If CodeExample becomes a client component for copy-to-clipboard, ensure Features and SecurityModel sections still work correctly (they are server components importing a now-client component, which is fine in Next.js).

### Step 4: Final build verification
```bash
npm run build -w apps/web  # Must succeed with zero errors
```

### Step 5: Verify all acceptance criteria
Walk through AC-1 through AC-6 from the Design Doc:
- AC-1: Hero animation, input, response, reduced-motion
- AC-2: 4 feature cards with CLI examples
- AC-3: Security constraints + JSON schema
- AC-4: Dark bg, glass cards, monospace, no rounded-full
- AC-5: 3 docs pages with sidebar/TOC
- AC-6: Responsive at 360px, 768px, 1280px+

## Acceptance Criteria
- [ ] Landing page renders correctly at 360px, 768px, 1280px+ (AC-6)
- [ ] Hero functional and readable at all breakpoints (AC-6)
- [ ] Docs navigable on mobile with responsive sidebar (AC-6)
- [ ] `prefers-reduced-motion` shows all hero lines immediately (AC-1)
- [ ] `npm run build -w apps/web` succeeds with zero TypeScript errors
- [ ] All acceptance criteria AC-1 through AC-6 satisfied

## Verification
```bash
npm run build -w apps/web  # Must succeed
```

Visual verification:
1. Enable `prefers-reduced-motion` in browser -- hero shows all lines immediately
2. Test landing page at 360px, 768px, 1280px viewports
3. Test docs pages at same viewports -- sidebar collapses on mobile
4. Run Lighthouse audit on landing page -- target performance score 90+
