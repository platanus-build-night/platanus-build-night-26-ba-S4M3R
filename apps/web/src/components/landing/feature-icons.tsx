"use client";

import { motion } from "framer-motion";

const ACCENT = "#3B82F6";
const ACCENT_DIM = "#60A5FA";
const MUTED = "#9A9590";

/** Privilege Isolation — shield with separated halves */
export function IconIsolation({ size = 40 }: { size?: number }) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} fill="none">
      {/* Ambient glow */}
      <motion.circle
        cx="20"
        cy="20"
        r="16"
        fill={ACCENT}
        opacity="0.06"
        animate={{ r: [16, 18, 16], opacity: [0.06, 0.1, 0.06] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Left half of shield */}
      <motion.path
        d="M20 6 L8 12 L8 22 C8 28 13 33 20 36"
        stroke={ACCENT}
        strokeWidth="1.5"
        strokeLinecap="round"
        animate={{ x: [-1, 0, -1] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Right half of shield */}
      <motion.path
        d="M20 6 L32 12 L32 22 C32 28 27 33 20 36"
        stroke={ACCENT_DIM}
        strokeWidth="1.5"
        strokeLinecap="round"
        animate={{ x: [1, 0, 1] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Divider line */}
      <motion.line
        x1="20"
        y1="8"
        x2="20"
        y2="34"
        stroke={MUTED}
        strokeWidth="1"
        strokeDasharray="2 3"
        opacity="0.4"
        animate={{ opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />
    </svg>
  );
}

/** Objective-Locked — crosshair/scope locked on target */
export function IconObjective({ size = 40 }: { size?: number }) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} fill="none">
      {/* Outer ring */}
      <circle cx="20" cy="20" r="12" stroke={MUTED} strokeWidth="1" opacity="0.3" />
      {/* Inner ring */}
      <motion.circle
        cx="20"
        cy="20"
        r="7"
        stroke={ACCENT}
        strokeWidth="1.5"
        animate={{ r: [7, 6.5, 7] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Center dot */}
      <motion.circle
        cx="20"
        cy="20"
        r="2"
        fill={ACCENT}
        animate={{ opacity: [0.8, 1, 0.8] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Crosshair lines */}
      <line x1="20" y1="6" x2="20" y2="14" stroke={MUTED} strokeWidth="1" opacity="0.5" />
      <line x1="20" y1="26" x2="20" y2="34" stroke={MUTED} strokeWidth="1" opacity="0.5" />
      <line x1="6" y1="20" x2="14" y2="20" stroke={MUTED} strokeWidth="1" opacity="0.5" />
      <line x1="26" y1="20" x2="34" y2="20" stroke={MUTED} strokeWidth="1" opacity="0.5" />
    </svg>
  );
}

/** Persistent Follow-ups — heartbeat pulse wave */
export function IconHeartbeat({ size = 40 }: { size?: number }) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} fill="none">
      {/* Baseline */}
      <line x1="4" y1="20" x2="36" y2="20" stroke={MUTED} strokeWidth="0.5" opacity="0.2" />
      {/* Heartbeat wave */}
      <motion.path
        d="M4 20 L12 20 L15 12 L18 28 L21 8 L24 26 L27 20 L36 20"
        stroke={ACCENT}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        animate={{ pathLength: [0, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        style={{ pathLength: 0 }}
      />
      {/* Trailing dot */}
      <motion.circle
        r="2.5"
        fill={ACCENT}
        animate={{
          cx: [4, 12, 15, 18, 21, 24, 27, 36],
          cy: [20, 20, 12, 28, 8, 26, 20, 20],
          opacity: [0, 1, 1, 1, 1, 1, 1, 0],
        }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />
    </svg>
  );
}

/** Full Observability — eye with scan line */
export function IconObservability({ size = 40 }: { size?: number }) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} fill="none">
      {/* Eye shape */}
      <path
        d="M4 20 C4 20 10 10 20 10 C30 10 36 20 36 20 C36 20 30 30 20 30 C10 30 4 20 4 20Z"
        stroke={ACCENT}
        strokeWidth="1.5"
      />
      {/* Iris */}
      <circle cx="20" cy="20" r="5" stroke={ACCENT_DIM} strokeWidth="1" />
      {/* Pupil */}
      <motion.circle
        cx="20"
        cy="20"
        r="2.5"
        fill={ACCENT}
        animate={{ cx: [20, 21, 20, 19, 20] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Scan line */}
      <motion.line
        x1="20"
        y1="8"
        x2="20"
        y2="32"
        stroke={ACCENT}
        strokeWidth="0.8"
        opacity="0.3"
        animate={{ x1: [8, 32, 8], x2: [8, 32, 8] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
    </svg>
  );
}

/** Structured Lifecycle — connected state nodes */
export function IconLifecycle({ size = 40 }: { size?: number }) {
  const nodes = [
    { cx: 8, cy: 20 },
    { cx: 16, cy: 12 },
    { cx: 24, cy: 20 },
    { cx: 32, cy: 12 },
  ];

  return (
    <svg viewBox="0 0 40 40" width={size} height={size} fill="none">
      {/* Connection lines */}
      <path
        d="M8 20 L16 12 L24 20 L32 12"
        stroke={MUTED}
        strokeWidth="1"
        opacity="0.3"
      />
      {/* Nodes */}
      {nodes.map((n, i) => (
        <motion.circle
          key={i}
          cx={n.cx}
          cy={n.cy}
          r="3"
          fill="none"
          stroke={ACCENT}
          strokeWidth="1.5"
          animate={{ fill: ["rgba(59,130,246,0)", "rgba(59,130,246,0.6)", "rgba(59,130,246,0)"] }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.5,
          }}
        />
      ))}
      {/* Active indicator - travels along the path */}
      <motion.circle
        r="1.5"
        fill={ACCENT}
        animate={{
          cx: [8, 16, 24, 32, 24, 16, 8],
          cy: [20, 12, 20, 12, 20, 12, 20],
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* End node */}
      <circle cx="32" cy="28" r="3" fill="none" stroke={ACCENT_DIM} strokeWidth="1.5" />
      <circle cx="32" cy="28" r="1.5" fill={ACCENT_DIM} opacity="0.5" />
      <path d="M32 12 L32 28" stroke={MUTED} strokeWidth="1" opacity="0.2" strokeDasharray="2 2" />
    </svg>
  );
}

/** Chat-to-Call Escalation — signal waves emanating */
export function IconEscalation({ size = 40 }: { size?: number }) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} fill="none">
      {/* Phone icon */}
      <path
        d="M12 16 L12 24 C12 25.1 12.9 26 14 26 L18 26 L22 30 L22 26 L26 26 C27.1 26 28 25.1 28 24 L28 16 C28 14.9 27.1 14 26 14 L14 14 C12.9 14 12 14.9 12 16Z"
        stroke={ACCENT}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Signal waves */}
      {[0, 1, 2].map((i) => (
        <motion.path
          key={i}
          d={`M${30 + i * 3} ${16 - i * 2} Q${33 + i * 3} 20 ${30 + i * 3} ${24 + i * 2}`}
          stroke={ACCENT_DIM}
          strokeWidth="1"
          strokeLinecap="round"
          fill="none"
          animate={{ opacity: [0, 0.6, 0] }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.4,
          }}
        />
      ))}
      {/* Dots in chat bubble */}
      <motion.g
        animate={{ opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <circle cx="17" cy="20" r="1" fill={MUTED} />
        <circle cx="20" cy="20" r="1" fill={MUTED} />
        <circle cx="23" cy="20" r="1" fill={MUTED} />
      </motion.g>
    </svg>
  );
}
