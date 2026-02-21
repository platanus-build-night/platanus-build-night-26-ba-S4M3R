# Task 004: Hero Component -- Interactive Terminal with Animation

## Overview
Create the Hero client component with 3-state terminal animation (animating -> idle -> responded), requestAnimationFrame typing effect, and prefers-reduced-motion support.

## Certainty
High -- standard React client component with animation logic.

## Dependencies
- Task 001 (brand tokens, layout with RootProvider)

## Target Files

### New Files
1. `apps/web/src/components/landing/hero.tsx`

## Implementation Steps

### Step 1: Create Hero component
Create `apps/web/src/components/landing/hero.tsx`:
```tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const PROMPT_LINES = [
  "> create an external agent",
  "> that can talk to users",
  "> without touching my system",
];

const CHAR_DELAY = 35; // ms per character, ~3.5s total for all lines

type HeroState = "animating" | "idle" | "responded";

export function Hero() {
  const [state, setState] = useState<HeroState>("animating");
  const [displayedLines, setDisplayedLines] = useState<string[]>([]);
  const [currentLine, setCurrentLine] = useState("");
  const [input, setInput] = useState("");
  const [response, setResponse] = useState("");
  const prefersReducedMotion = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    prefersReducedMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion.current) {
      setDisplayedLines(PROMPT_LINES);
      setCurrentLine("");
      setState("idle");
      return;
    }

    let cancelled = false;
    let lineIndex = 0;
    let charIndex = 0;
    let lastTime = 0;

    function animate(time: number) {
      if (cancelled) return;
      if (time - lastTime < CHAR_DELAY) {
        requestAnimationFrame(animate);
        return;
      }
      lastTime = time;

      const line = PROMPT_LINES[lineIndex];
      if (charIndex <= line.length) {
        setCurrentLine(line.slice(0, charIndex));
        charIndex++;
        requestAnimationFrame(animate);
      } else {
        setDisplayedLines((prev) => [...prev, line]);
        setCurrentLine("");
        lineIndex++;
        charIndex = 0;
        if (lineIndex < PROMPT_LINES.length) {
          requestAnimationFrame(animate);
        } else {
          setState("idle");
        }
      }
    }

    requestAnimationFrame(animate);
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (state === "idle") {
      inputRef.current?.focus();
    }
  }, [state]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const truncated = input.length > 40 ? input.slice(0, 40) + "..." : input;
    setResponse(
      `relay v0.1.0 -- analyzing use case...\n\n` +
      `  objective:    "${truncated}"\n` +
      `  channels:     [whatsapp, voice]\n` +
      `  isolation:    strict -- no code exec, no file access\n` +
      `  output:       structured JSON via \`relay pull\`\n\n` +
      `  $ relay interview start --objective="..."\n` +
      `  > session ready. relay is isolated. your system is untouched.`
    );
    setState("responded");
  }, [input]);

  return (
    <section className="flex flex-col items-center justify-center min-h-[70vh] px-6 py-16">
      <div className="w-full max-w-2xl bg-[#050505] border border-glass-border p-6 font-mono text-sm">
        {/* Completed lines */}
        {displayedLines.map((line, i) => (
          <div key={i} className="text-foreground">{line}</div>
        ))}

        {/* Currently animating line */}
        {state === "animating" && currentLine && (
          <div className="text-foreground">
            {currentLine}
            <span className="animate-pulse">_</span>
          </div>
        )}

        {/* Input field */}
        {state === "idle" && (
          <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
            <span className="text-muted select-none">$</span>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="describe your use case..."
              className="flex-1 bg-transparent text-foreground outline-none placeholder:text-muted"
            />
          </form>
        )}

        {/* Response */}
        {state === "responded" && (
          <pre className="mt-4 text-foreground whitespace-pre-wrap">{response}</pre>
        )}
      </div>
    </section>
  );
}
```

## Acceptance Criteria
- [ ] Hero component renders with "use client" directive
- [ ] 3 prompt lines animate character-by-character via requestAnimationFrame
- [ ] Animation completes within ~4 seconds
- [ ] After animation, input field with "$ describe your use case..." placeholder is active
- [ ] Submitting input renders hardcoded CLI response
- [ ] `prefers-reduced-motion` skips animation and shows all lines immediately
- [ ] `npm run build -w apps/web` succeeds (L3)

## Verification
```bash
npm run build -w apps/web  # Must succeed
```
Visual verification: run dev server, observe animation plays 3 lines, input becomes active, submit shows response.
