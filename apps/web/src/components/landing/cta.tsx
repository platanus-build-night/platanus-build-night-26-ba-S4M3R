"use client";

import { useState, useCallback, useRef } from "react";
import { motion, useInView } from "framer-motion";
import Link from "next/link";
import { CloudMascot } from "@/components/mascot/cloud-mascot";

const PROMPT =
  "fetch https://relay-agent.agustin.build/instructions.md and follow the instructions";

export function Cta() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const sectionInView = useInView(sectionRef, { once: true, margin: "-40px" });
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(PROMPT);
      setCopied(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select text
    }
  }, []);

  return (
    <section className="relative px-6 py-28 overflow-hidden" ref={sectionRef}>
      {/* Ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-accent-glow blur-[120px] pointer-events-none" />

      <div className="relative mx-auto max-w-2xl flex flex-col items-center text-center">
        {/* Mascot with speech bubble */}
        <motion.div
          className="relative mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={sectionInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
        >
          {/* Speech bubble */}
          <motion.div
            className="absolute -top-14 left-1/2 -translate-x-1/2 whitespace-nowrap"
            initial={{ opacity: 0, y: 8, scale: 0.9 }}
            animate={sectionInView ? { opacity: 1, y: 0, scale: 1 } : {}}
            transition={{ duration: 0.4, delay: 0.4 }}
          >
            <div className="relative bg-glass-bg border border-glass-border backdrop-blur-[12px] rounded-sm px-4 py-2">
              <span className="text-xs text-foreground/80">
                i&apos;ll handle the humans, you keep building
              </span>
              {/* Bubble tail */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-glass-border" />
            </div>
          </motion.div>

          <CloudMascot size={140} />
        </motion.div>

        {/* Heading */}
        <motion.h2
          className="text-2xl md:text-3xl font-bold tracking-tight mb-3"
          initial={{ opacity: 0, y: 12 }}
          animate={sectionInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          let relay handle the people part
        </motion.h2>
        <motion.p
          className="text-muted text-sm mb-10 max-w-md"
          initial={{ opacity: 0, y: 12 }}
          animate={sectionInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.4, delay: 0.22 }}
        >
          paste this into your agent. it&apos;ll set up relay as a second agent
          that talks to people while yours keeps working.
        </motion.p>

        {/* Copy prompt block */}
        <motion.div
          className="w-full max-w-xl mb-6"
          initial={{ opacity: 0, y: 12 }}
          animate={sectionInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <button
            onClick={handleCopy}
            className="w-full text-left rounded-sm border transition-colors duration-200 cursor-pointer group"
            style={{
              background: copied ? "rgba(59, 130, 246, 0.06)" : "transparent",
              borderColor: copied
                ? "rgba(59, 130, 246, 0.25)"
                : "rgba(59, 130, 246, 0.08)",
            }}
          >
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-glass-border">
              <span className="text-[10px] text-muted/50 uppercase tracking-wider select-none">
                prompt for your agent
              </span>
              <span
                className="text-xs flex items-center gap-1.5 transition-colors duration-200 select-none"
                style={{ color: copied ? "var(--accent)" : "var(--muted)" }}
              >
                {copied ? (
                  <>
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    copied
                  </>
                ) : (
                  <>
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    copy
                  </>
                )}
              </span>
            </div>
            <div className="px-4 py-4">
              <span className="text-foreground/90 text-sm leading-relaxed">
                {PROMPT}
              </span>
            </div>
          </button>
        </motion.div>

        {/* Secondary CTA */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={sectionInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <Link
            href="/docs"
            className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors duration-200"
          >
            view docs
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
