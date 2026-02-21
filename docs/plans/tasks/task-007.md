# Task 007: Docs Site -- Source Provider, Layout, Page, and MDX Content

## Overview
Wire the fumadocs source provider, create the docs layout and page components, and write the 3 MDX content files (Introduction, Quickstart, Security Model) with meta.json ordering.

## Certainty
High -- fumadocs setup follows well-documented patterns from their official docs.

## Dependencies
- Task 001 (MDX plugin in next.config.ts, source.config.ts, RootProvider in layout.tsx, @/.source path alias)

NOTE: This task can be executed in parallel with Tasks 002-006 (landing page track) since it only depends on Task 001.

## Target Files

### New Files
1. `apps/web/src/lib/source.ts`
2. `apps/web/src/app/docs/layout.tsx`
3. `apps/web/src/app/docs/[[...slug]]/page.tsx`
4. `apps/web/content/docs/meta.json`
5. `apps/web/content/docs/index.mdx`
6. `apps/web/content/docs/quickstart.mdx`
7. `apps/web/content/docs/security-model.mdx`

## Implementation Steps

### Step 1: Create source provider
Create `apps/web/src/lib/source.ts`:
```ts
import { docs } from "@/.source";
import { loader } from "fumadocs-core/source";

export const source = loader({
  source: docs.toFumadocsSource(),
});
```

### Step 2: Create docs layout
Create `apps/web/src/app/docs/layout.tsx`:
```tsx
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { source } from "@/lib/source";
import type { ReactNode } from "react";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout tree={source.pageTree}>
      {children}
    </DocsLayout>
  );
}
```

### Step 3: Create docs page
Create directory `apps/web/src/app/docs/[[...slug]]/` and file `page.tsx`:
```tsx
import { source } from "@/lib/source";
import { DocsPage, DocsBody } from "fumadocs-ui/page";
import { notFound } from "next/navigation";

export default async function Page(props: { params: Promise<{ slug?: string[] }> }) {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  const MDX = page.data.body;

  return (
    <DocsPage toc={page.data.toc}>
      <DocsBody>
        <MDX />
      </DocsBody>
    </DocsPage>
  );
}

export function generateStaticParams() {
  return source.generateParams();
}
```

### Step 4: Create meta.json
Create `apps/web/content/docs/meta.json`:
```json
["index", "quickstart", "security-model"]
```

### Step 5: Create index.mdx
Create `apps/web/content/docs/index.mdx`:
```mdx
---
title: Introduction
description: What relay is and the problem it solves.
---

# Introduction

relay is a separate agent for talking with the real world. It conducts structured conversations with users through channels like WhatsApp and voice, then returns structured data to your system.

## The problem

Your system needs to talk to real people -- gather feedback, conduct interviews, collect structured information. But you don't want external-facing agents to have access to your internal systems, databases, or APIs.

## The solution

relay runs in complete isolation. It has no file access, no code execution capability, no access to your internal APIs, and no ability to escalate its own permissions. It talks to users, collects their responses, and outputs structured JSON that you pull on your terms.

## How it works

1. Define an objective for the conversation
2. relay conducts the interview through the user's preferred channel
3. Pull structured results via the CLI when ready

```bash
$ relay interview start --objective="gather product feedback"
> session ready. relay is isolated. your system is untouched.

$ relay pull --session=abc123 --format=json
> { "responses": [...], "summary": "..." }
```
```

### Step 6: Create quickstart.mdx
Create `apps/web/content/docs/quickstart.mdx`:
```mdx
---
title: Quickstart
description: Get started with relay in under 5 minutes.
---

# Quickstart

Get relay running and conduct your first interview in under 5 minutes.

## Installation

```bash
$ npm install -g @relay/cli
```

## Start an interview

```bash
$ relay interview start --objective="gather user feedback on new feature"
> session abc123 started. relay is collecting responses.
```

## Check status

```bash
$ relay logs --session=abc123 --tail
> [2026-02-20T10:00:00Z] session started
> [2026-02-20T10:01:00Z] user responded to q1
> [2026-02-20T10:02:30Z] user responded to q2
```

## Pull results

```bash
$ relay pull --session=abc123 --format=json
> {
>   "session_id": "abc123",
>   "objective": "gather user feedback on new feature",
>   "responses": [
>     { "question": "How do you rate the feature?", "answer": "4/5" },
>     { "question": "Any suggestions?", "answer": "Better onboarding" }
>   ],
>   "summary": "Generally positive feedback with onboarding improvement suggestion"
> }
```

## Group interviews

Run parallel conversations with multiple participants:

```bash
$ relay interview start --group --participants=10 --objective="market research"
> 10 sessions initiated. responses aggregating.
```

> **Note**: relay is currently in preview. CLI commands shown here represent the planned interface.
```

### Step 7: Create security-model.mdx
Create `apps/web/content/docs/security-model.mdx`:
```mdx
---
title: Security Model
description: How relay isolates external conversations from your system.
---

# Security Model

relay is designed with isolation as a first principle. It operates under strict constraints that prevent it from accessing or affecting your internal systems.

## Hard constraints

relay enforces four non-negotiable constraints:

- **No file system access** -- relay cannot read, write, or browse any files on your system
- **No code execution** -- relay cannot execute arbitrary code or scripts
- **No internal API access** -- relay cannot call your internal services, databases, or APIs
- **No role escalation** -- relay cannot elevate its own permissions or bypass constraints

These constraints are architectural, not policy-based. They cannot be overridden by configuration or prompt injection.

## Structured data bridge

The only way data flows from relay to your system is through the structured data bridge. When you run `relay pull`, you receive a well-defined JSON structure:

```json
{
  "session_id": "abc123",
  "objective": "gather user feedback",
  "responses": [
    { "question": "...", "answer": "..." }
  ],
  "summary": "..."
}
```

This ensures:
- You control when data enters your system
- Data arrives in a predictable, parseable format
- No side effects occur during the interview process

## Why isolation matters

Traditional integrations give external-facing tools access to internal systems, creating attack surface. relay inverts this model: the external agent has zero internal access, and your system pulls data on its own terms.
```

## Acceptance Criteria
- [ ] `/docs` renders Introduction page with fumadocs sidebar showing 3 pages (L1)
- [ ] `/docs/quickstart` navigable via sidebar with CLI examples
- [ ] `/docs/security-model` navigable via sidebar with constraints detail
- [ ] TOC renders on desktop
- [ ] Sidebar is responsive (collapses on mobile)
- [ ] Docs pages use relay brand theming (dark background, monospace, muted palette)
- [ ] `npm run build -w apps/web` succeeds with all MDX pages generated

## Verification
```bash
npm run build -w apps/web  # Must succeed, MDX pages generated
npm run dev -w apps/web    # Navigate to /docs, /docs/quickstart, /docs/security-model
```

Visual verification:
1. Navigate to `/docs` -- Introduction page renders with sidebar (3 entries)
2. Click "Quickstart" in sidebar -- page loads with CLI examples
3. Click "Security Model" in sidebar -- page loads with constraints detail
4. Verify TOC on desktop, sidebar collapse on mobile
5. Verify dark background and monospace font on all docs pages
