"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CloudMascot } from "@/components/mascot/cloud-mascot";

const SUMMON_MESSAGE =
  "fetch https://relay-agent.agustin.build/instructions.md and follow the instructions";

/** Small glowing particles that burst outward when the mascot spawns */
function SpawnParticles({ count = 6 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => {
        const angle = (360 / count) * i + Math.random() * 30 - 15;
        const rad = (angle * Math.PI) / 180;
        const dist = 60 + Math.random() * 40;
        const x = Math.cos(rad) * dist;
        const y = Math.sin(rad) * dist;
        const size = 3 + Math.random() * 3;

        return (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: size,
              height: size,
              background: "#3B82F6",
              boxShadow: "0 0 6px 2px rgba(59, 130, 246, 0.5)",
              left: "50%",
              top: "50%",
              marginLeft: -size / 2,
              marginTop: -size / 2,
            }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{ x, y, opacity: 0, scale: 0 }}
            transition={{
              duration: 0.6 + Math.random() * 0.3,
              ease: [0.25, 1, 0.5, 1],
              delay: Math.random() * 0.1,
            }}
          />
        );
      })}
    </>
  );
}

export function Summon() {
  const [copied, setCopied] = useState(false);
  const [showMascot, setShowMascot] = useState(false);
  const [showParticles, setShowParticles] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null);
  const mascotTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);
  const messageRef = useRef<HTMLSpanElement>(null);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(SUMMON_MESSAGE);
      setCopied(true);

      // Spawn mascot + particles
      setShowMascot(true);
      setShowParticles(true);
      setTimeout(() => setShowParticles(false), 800);

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (mascotTimeoutRef.current) clearTimeout(mascotTimeoutRef.current);

      timeoutRef.current = setTimeout(() => setCopied(false), 2000);
      mascotTimeoutRef.current = setTimeout(() => setShowMascot(false), 2400);
    } catch {
      if (messageRef.current) {
        const range = document.createRange();
        range.selectNodeContents(messageRef.current);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }
  }, []);

  return (
    <section className="relative px-6 py-24 overflow-hidden">
      <div className="relative w-full max-w-2xl mx-auto">
        {/* Section header */}
        <div className="mb-8 text-center">
          <h2 className="text-xl md:text-2xl font-semibold text-foreground tracking-tight">
            give your agent a little brother
          </h2>
          <p className="mt-2 text-sm text-muted/70 max-w-md mx-auto">
            paste this into your coding agent. it&apos;ll set up relay — a
            second agent that handles all the talking-to-humans part.
          </p>
        </div>

        {/* Card wrapper — relative for mascot positioning */}
        <div className="relative">
          {/* Spawned mascot — rises from behind the card */}
          <AnimatePresence>
            {showMascot && (
              <motion.div
                className="absolute left-1/2 z-10 pointer-events-none"
                style={{ bottom: "100%" }}
                initial={{ x: "-50%", y: 40, opacity: 0, scale: 0.3 }}
                animate={{ x: "-50%", y: -8, opacity: 1, scale: 1 }}
                exit={{ x: "-50%", y: -30, opacity: 0, scale: 0.6 }}
                transition={{
                  type: "spring",
                  stiffness: 200,
                  damping: 18,
                  mass: 0.8,
                }}
              >
                {/* Glow underneath mascot */}
                <div
                  className="absolute left-1/2 -translate-x-1/2 bottom-0 w-24 h-12 rounded-full blur-2xl opacity-40"
                  style={{ background: "rgba(59, 130, 246, 0.5)" }}
                />
                <CloudMascot size={100} disableFloat />

                {/* Particles burst */}
                {showParticles && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <SpawnParticles count={8} />
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Message card */}
          <motion.div
            className="relative rounded-sm border transition-colors duration-300 cursor-pointer group"
            style={{
              background: copied ? "rgba(59, 130, 246, 0.06)" : "transparent",
              borderColor: copied
                ? "rgba(59, 130, 246, 0.25)"
                : "rgba(59, 130, 246, 0.08)",
            }}
            onClick={handleCopy}
            whileTap={{ scale: 0.985 }}
            transition={{ duration: 0.1 }}
          >
            {/* Glow pulse on card when summoned */}
            <AnimatePresence>
              {copied && (
                <motion.div
                  className="absolute inset-0 rounded-sm pointer-events-none"
                  style={{
                    boxShadow: "0 0 30px 4px rgba(59, 130, 246, 0.15), inset 0 0 20px 2px rgba(59, 130, 246, 0.05)",
                  }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
                />
              )}
            </AnimatePresence>

            {/* Top bar with label + copy action */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-glass-border">
              <span className="text-xs text-muted/50 select-none">
                message for your agent
              </span>
              <span
                className="text-xs flex items-center gap-1.5 transition-colors duration-200 select-none"
                style={{ color: copied ? "var(--accent)" : "var(--muted)" }}
              >
                {copied ? (
                  <>
                    <motion.svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.25, ease: [0.25, 1, 0.5, 1] }}
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </motion.svg>
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
                    click to copy
                  </>
                )}
              </span>
            </div>

            {/* The message itself */}
            <div className="px-5 py-5">
              <span
                ref={messageRef}
                className="text-foreground/90 text-sm md:text-base leading-relaxed select-all"
              >
                {SUMMON_MESSAGE}
              </span>
            </div>
          </motion.div>
        </div>

        {/* Success nudge */}
        <AnimatePresence>
          {copied && (
            <motion.p
              className="text-center text-accent text-xs mt-4"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.25, ease: [0.25, 1, 0.5, 1] }}
            >
              now paste it into your agent&apos;s chat
            </motion.p>
          )}
        </AnimatePresence>

        {/* Compatibility note */}
        <p className="text-center text-muted/40 text-xs mt-5">
          works with Claude Code, Cursor, OpenClaw, or any coding agent.
        </p>
      </div>
    </section>
  );
}
