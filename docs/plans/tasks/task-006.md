# Task 006: Assemble Landing Page -- page.tsx

## Overview
Replace the Next.js boilerplate in page.tsx with the assembled landing page, importing Header, Hero, Features, SecurityModel, and Footer.

## Certainty
High -- composition of already-created components.

## Dependencies
- Task 003 (Header, Footer)
- Task 004 (Hero)
- Task 005 (Features, SecurityModel)

## Target Files

### Modified Files
1. `apps/web/src/app/page.tsx` -- Replace boilerplate with landing page assembly

## Implementation Steps

### Step 1: Replace page.tsx
Replace the entire contents of `apps/web/src/app/page.tsx` with:
```tsx
import { Header } from "@/components/layout/header";
import { Hero } from "@/components/landing/hero";
import { Features } from "@/components/landing/features";
import { SecurityModel } from "@/components/landing/security-model";
import { Footer } from "@/components/layout/footer";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Hero />
        <Features />
        <SecurityModel />
      </main>
      <Footer />
    </div>
  );
}
```

## Acceptance Criteria
- [ ] Landing page renders at `/` with all sections visible (L1)
- [ ] Header with "relay" logo and "Docs" link is visible at top
- [ ] Hero animation plays and input field becomes active
- [ ] 4 feature cards with CLI examples visible in Features section
- [ ] Security constraints list and JSON schema visible in SecurityModel section
- [ ] Footer with copyright visible at bottom
- [ ] Brand styling correct: dark bg, glass cards, monospace, no rounded-full
- [ ] `npm run build -w apps/web` succeeds

## Verification
```bash
npm run build -w apps/web  # Must succeed
npm run dev -w apps/web    # Navigate to / and verify all sections
```

Visual verification:
1. Navigate to `/` -- Hero animation plays 3 lines, completes within 4 seconds
2. Type in hero input, press Enter -- hardcoded CLI response appears
3. Scroll to Features -- 4 GlassCards with TerminalBlock code examples
4. Scroll to Security Model -- constraints list + JSON schema in TerminalBlock
5. Check Header has "relay" logo and "Docs" link; Footer has copyright
