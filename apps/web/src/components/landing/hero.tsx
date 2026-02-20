"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const PROMPT_LINES = [
  "> create an external agent",
  "> that can talk to users",
  "> without touching my system",
];

const CHAR_DELAY = 35;
const LINE_DELAY = 400;

type HeroState = "animating" | "idle" | "responded";

export function Hero() {
  const [state, setState] = useState<HeroState>("animating");
  const [displayedLines, setDisplayedLines] = useState<string[]>([]);
  const [currentLine, setCurrentLine] = useState("");
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const reducedMotion = useRef(false);

  useEffect(() => {
    reducedMotion.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (reducedMotion.current) {
      setDisplayedLines(PROMPT_LINES);
      setCurrentLine("");
      setState("idle");
      return;
    }

    let cancelled = false;

    async function animate() {
      for (let lineIdx = 0; lineIdx < PROMPT_LINES.length; lineIdx++) {
        const line = PROMPT_LINES[lineIdx];
        for (let charIdx = 0; charIdx <= line.length; charIdx++) {
          if (cancelled) return;
          await new Promise((r) => setTimeout(r, CHAR_DELAY));
          setCurrentLine(line.slice(0, charIdx));
        }
        if (cancelled) return;
        setDisplayedLines((prev) => [...prev, line]);
        setCurrentLine("");
        if (lineIdx < PROMPT_LINES.length - 1) {
          await new Promise((r) => setTimeout(r, LINE_DELAY));
        }
      }
      if (!cancelled) {
        setState("idle");
      }
    }

    animate();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (state === "idle" && inputRef.current) {
      inputRef.current.focus();
    }
  }, [state]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!input.trim()) return;
      setState("responded");
    },
    [input]
  );

  return (
    <section className="min-h-[80vh] flex items-center justify-center px-6">
      <div className="w-full max-w-2xl">
        <div className="bg-[#111] border border-glass-border rounded-sm p-6 md:p-8 font-mono text-sm md:text-base">
          {/* Animated prompt lines */}
          {displayedLines.map((line, i) => (
            <div key={i} className="text-foreground/90 leading-relaxed">
              {line}
            </div>
          ))}

          {/* Currently typing line */}
          {state === "animating" && currentLine && (
            <div className="text-foreground/90 leading-relaxed">
              {currentLine}
              <span className="inline-block w-2 h-4 bg-accent ml-0.5 animate-pulse" />
            </div>
          )}

          {/* Cursor while animating with no current text */}
          {state === "animating" && !currentLine && displayedLines.length === 0 && (
            <div>
              <span className="inline-block w-2 h-4 bg-accent animate-pulse" />
            </div>
          )}

          {/* Input field */}
          {(state === "idle" || state === "responded") && (
            <form onSubmit={handleSubmit} className="mt-4">
              <div className="flex items-center gap-2 text-muted">
                <span className="select-none shrink-0">$</span>
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="describe your use case..."
                  disabled={state === "responded"}
                  className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted/50 disabled:opacity-60"
                />
              </div>
            </form>
          )}

          {/* Hardcoded response */}
          {state === "responded" && (
            <div className="mt-6 border-t border-glass-border pt-4 space-y-1 text-foreground/80">
              <div className="text-accent">relay v0.1.0 — analyzing use case...</div>
              <div className="mt-3 space-y-1">
                <div>
                  <span className="text-muted">objective:</span>{" "}
                  <span>&ldquo;{input.length > 60 ? input.slice(0, 60) + "..." : input}&rdquo;</span>
                </div>
                <div>
                  <span className="text-muted">channels:</span> [whatsapp, voice]
                </div>
                <div>
                  <span className="text-muted">isolation:</span> strict — no code exec, no file access
                </div>
                <div>
                  <span className="text-muted">output:</span> structured JSON via{" "}
                  <span className="text-accent">`relay pull`</span>
                </div>
              </div>
              <div className="mt-4 space-y-1">
                <div className="text-muted">
                  $ relay interview start --objective=&quot;...&quot;
                </div>
                <div className="text-accent">
                  &gt; session ready. relay is isolated. your system is untouched.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tagline below terminal */}
        <p className="text-center text-muted text-xs mt-6">
          a separate agent for talking with the real world.
        </p>
      </div>
    </section>
  );
}
