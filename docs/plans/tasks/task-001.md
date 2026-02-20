# Task 001: Foundation -- Dependencies, Config, Tokens, Layout

## Overview
Install fumadocs dependencies, replace globals.css with relay brand tokens, update layout.tsx with JetBrains Mono and RootProvider, configure next.config.ts with MDX plugin, and create source.config.ts.

## Certainty
High -- fumadocs v16 documentation is well-established; Next.js 16 App Router is standard.

## Dependencies
None (first task).

## Target Files

### Modified Files
1. `apps/web/package.json` -- Add fumadocs-core, fumadocs-ui, fumadocs-mdx, shiki dependencies
2. `apps/web/src/app/globals.css` -- Replace with relay brand tokens + fumadocs CSS imports
3. `apps/web/src/app/layout.tsx` -- Swap Geist for JetBrains Mono, wrap with RootProvider, set dark class
4. `apps/web/next.config.ts` -- Wrap config with createMDX()
5. `apps/web/tsconfig.json` -- Add @/.source path alias

### New Files
6. `apps/web/source.config.ts` -- defineDocs configuration

## Implementation Steps

### Step 1: Install dependencies
```bash
cd apps/web
npm install fumadocs-core@^16 fumadocs-ui@^16 fumadocs-mdx@^14 shiki@^3
```

### Step 2: Replace globals.css
Replace the entire contents of `apps/web/src/app/globals.css` with:
```css
@import "tailwindcss";
@import "fumadocs-ui/css/neutral.css";
@import "fumadocs-ui/css/preset.css";

:root {
  --background: #0a0a0a;
  --foreground: #ededed;
  --muted: #888888;
  --accent: #4a9fc7;
  --glass-bg: rgba(255, 255, 255, 0.05);
  --glass-border: rgba(255, 255, 255, 0.1);
  --glass-blur: 12px;

  /* fumadocs theme overrides */
  --color-fd-background: #0a0a0a;
  --color-fd-foreground: #ededed;
  --color-fd-muted: #888888;
  --color-fd-muted-foreground: #666666;
  --color-fd-border: rgba(255, 255, 255, 0.1);
  --color-fd-accent: #4a9fc7;
  --color-fd-accent-foreground: #ededed;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-muted: var(--muted);
  --color-accent: var(--accent);
  --color-glass-bg: var(--glass-bg);
  --color-glass-border: var(--glass-border);
  --font-mono: var(--font-jetbrains-mono), "Fira Code", "SF Mono", "Cascadia Code", monospace;
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-mono);
}
```

### Step 3: Update layout.tsx
```tsx
import { JetBrains_Mono } from "next/font/google";
import { RootProvider } from "fumadocs-ui/provider/next";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "relay",
  description: "A separate agent for talking with the real world.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${jetbrainsMono.variable} font-mono antialiased`}>
        <RootProvider>
          {children}
        </RootProvider>
      </body>
    </html>
  );
}
```

### Step 4: Update next.config.ts
```ts
import { createMDX } from "fumadocs-mdx/next";
import type { NextConfig } from "next";

const withMDX = createMDX();

const nextConfig: NextConfig = {
  /* config options here */
};

export default withMDX(nextConfig);
```

### Step 5: Create source.config.ts
Create `apps/web/source.config.ts`:
```ts
import { defineDocs } from "fumadocs-mdx/config";

export const docs = defineDocs({
  dir: "content/docs",
});
```

### Step 6: Update tsconfig.json
Add the `@/.source` path alias:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@/.source": ["./.source"]
    }
  }
}
```

### Step 7: Install and verify
```bash
npm install
npm run build -w apps/web
```

## Acceptance Criteria
- [ ] `npm run build -w apps/web` succeeds (L3)
- [ ] No TypeScript errors in modified files
- [ ] fumadocs dependencies present in package.json
- [ ] `source.config.ts` exists with defineDocs configuration
- [ ] `globals.css` contains relay brand tokens and fumadocs CSS imports
- [ ] `layout.tsx` uses JetBrains Mono and RootProvider
- [ ] `next.config.ts` wraps config with createMDX()
- [ ] `tsconfig.json` has @/.source path alias

## Verification
```bash
npm run build -w apps/web  # Must succeed
npm run dev -w apps/web    # Page loads with dark background (#0a0a0a) and monospace font
```
