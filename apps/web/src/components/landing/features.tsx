"use client";

import { motion, useInView } from "framer-motion";
import { useRef, type ComponentType, type ReactNode } from "react";
import {
  IconIsolation,
  IconObjective,
  IconHeartbeat,
  IconObservability,
  IconLifecycle,
  IconEscalation,
} from "./feature-icons";
import { CloudMascot } from "@/components/mascot/cloud-mascot";

/* ── Tiny Open Claw logo ── */
function OpenClawMini({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} fill="none">
      <defs>
        <linearGradient id="oc-mini-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF6B6B" />
          <stop offset="100%" stopColor="#C0392B" />
        </linearGradient>
      </defs>
      <path d="M60 10 C30 10 15 35 15 55 C15 75 30 95 45 100 L45 110 L55 110 L55 100 C55 100 60 102 65 100 L65 110 L75 110 L75 100 C90 95 105 75 105 55 C105 35 90 10 60 10Z" fill="url(#oc-mini-grad)" />
      <path d="M20 45 C5 40 0 50 5 60 C10 70 20 65 25 55 C28 48 25 45 20 45Z" fill="url(#oc-mini-grad)" />
      <path d="M100 45 C115 40 120 50 115 60 C110 70 100 65 95 55 C92 48 95 45 100 45Z" fill="url(#oc-mini-grad)" />
      <circle cx="45" cy="35" r="6" fill="#0a0a0a" />
      <circle cx="75" cy="35" r="6" fill="#0a0a0a" />
      <circle cx="46" cy="34" r="2" fill="#67E8F9" />
      <circle cx="76" cy="34" r="2" fill="#67E8F9" />
    </svg>
  );
}

/* ── Capability tag ── */
function Tag({ children, muted }: { children: ReactNode; muted?: boolean }) {
  return (
    <span
      className={`inline-block text-[10px] px-1.5 py-0.5 rounded-sm border ${
        muted
          ? "border-glass-border text-muted/60"
          : "border-accent/30 text-accent"
      }`}
    >
      {children}
    </span>
  );
}

/* ── 1. Isolation: two agent columns ── */
function IsolationVisual() {
  return (
    <div className="grid grid-cols-2 gap-3 text-[11px]">
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <OpenClawMini size={18} />
          <span className="text-muted text-[10px] uppercase tracking-wider">
            your agent
          </span>
        </div>
        <div className="flex flex-wrap gap-1">
          <Tag>filesystem</Tag>
          <Tag>APIs</Tag>
          <Tag>secrets</Tag>
          <Tag>code exec</Tag>
        </div>
      </div>
      <div className="space-y-2 border-l border-dashed border-glass-border pl-3">
        <div className="flex items-center gap-1.5">
          <CloudMascot size={20} disableFloat />
          <span className="text-muted text-[10px] uppercase tracking-wider">
            relay
          </span>
        </div>
        <div className="flex flex-wrap gap-1">
          <Tag muted>send_message</Tag>
          <Tag muted>end_conversation</Tag>
        </div>
      </div>
    </div>
  );
}

/* ── 2. Objective: scoped checklist ── */
function ObjectiveVisual() {
  return (
    <div className="space-y-2 text-[11px]">
      <div className="flex items-center gap-2 text-muted">
        <span className="text-[10px] uppercase tracking-wider">objective</span>
        <span className="text-foreground/80">confirm delivery time</span>
      </div>
      <div className="space-y-1 pl-1">
        <div className="flex items-center gap-2">
          <span className="text-accent">✓</span>
          <span className="text-muted line-through">ask ETA</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-accent">✓</span>
          <span className="text-muted line-through">confirm address</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted/40">○</span>
          <span className="text-foreground/70">get signature</span>
        </div>
      </div>
    </div>
  );
}

/* ── 3. Heartbeat: follow-up timeline ── */
function HeartbeatVisual() {
  return (
    <div className="flex items-center gap-0 text-[10px] overflow-hidden">
      {[
        { label: "sent", active: true },
        { label: "30m", active: false },
        { label: "follow-up 1", active: true },
        { label: "30m", active: false },
        { label: "follow-up 2", active: true },
      ].map((step, i) => (
        <div key={i} className="flex items-center gap-0">
          {i > 0 && (
            <div
              className={`w-4 h-px ${step.active ? "bg-accent/40" : "bg-glass-border"}`}
            />
          )}
          <div className="flex flex-col items-center gap-1">
            <div
              className={`w-2 h-2 rounded-full ${
                step.active ? "bg-accent" : "bg-glass-border"
              }`}
            />
            <span
              className={
                step.active ? "text-foreground/70 whitespace-nowrap" : "text-muted/50 whitespace-nowrap"
              }
            >
              {step.label}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── 4. Observability: live status indicators ── */
function ObservabilityVisual() {
  return (
    <div className="grid grid-cols-3 gap-3 text-[11px]">
      {[
        { label: "messages", value: "12" },
        { label: "todo", value: "2/3" },
        { label: "wait time", value: "4m" },
      ].map((stat) => (
        <div key={stat.label} className="space-y-1">
          <span className="text-muted text-[10px] uppercase tracking-wider block">
            {stat.label}
          </span>
          <span className="text-foreground text-sm font-bold">{stat.value}</span>
        </div>
      ))}
    </div>
  );
}

/* ── 5. Lifecycle: state flow ── */
function LifecycleVisual() {
  const states = ["CREATED", "ACTIVE", "WAITING", "COMPLETED"];
  return (
    <div className="flex items-center gap-0 text-[10px] overflow-hidden">
      {states.map((state, i) => (
        <div key={state} className="flex items-center gap-0">
          {i > 0 && <span className="text-muted/30 mx-1">→</span>}
          <span
            className={`px-1.5 py-0.5 rounded-sm border ${
              i === 2
                ? "border-accent/40 text-accent bg-accent/5"
                : "border-glass-border text-muted/60"
            }`}
          >
            {state}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── 6. Escalation: channel transition ── */
function EscalationVisual() {
  return (
    <div className="flex items-center gap-3 text-[11px]">
      <div className="flex items-center gap-2 px-2 py-1.5 rounded-sm border border-accent/30 bg-accent/5">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-accent">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <span className="text-foreground/80">WhatsApp</span>
      </div>
      <span className="text-muted/40">→</span>
      <div className="flex items-center gap-2 px-2 py-1.5 rounded-sm border border-glass-border">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
        <span className="text-muted">voice call</span>
      </div>
    </div>
  );
}

/* ── Feature data ── */

interface FeatureData {
  name: string;
  description: string;
  icon: ComponentType<{ size?: number }>;
  visual: ComponentType;
}

const FEATURES: FeatureData[] = [
  {
    name: "Privilege Isolation",
    icon: IconIsolation,
    description:
      "Your main agent keeps full system access. relay gets conversation-only permissions. No shared execution context, no capability leakage.",
    visual: IsolationVisual,
  },
  {
    name: "Objective-Locked Execution",
    icon: IconObjective,
    description:
      "Each conversation is scoped to a single objective with a structured todo list. The agent stays on task — ignores jailbreaks, topic changes, and off-scope requests.",
    visual: ObjectiveVisual,
  },
  {
    name: "Persistent Follow-ups",
    icon: IconHeartbeat,
    description:
      "Contacts go silent. relay doesn't. Automatic heartbeat follow-ups with configurable intervals and limits — no manual babysitting.",
    visual: HeartbeatVisual,
  },
  {
    name: "Full Observability",
    icon: IconObservability,
    description:
      "Every message, every state change, every todo item — visible in real time. Your main agent always knows what's happening without being exposed.",
    visual: ObservabilityVisual,
  },
  {
    name: "Structured Lifecycle",
    icon: IconLifecycle,
    description:
      "Conversations follow a state machine, not freeform chat. Every instance has a defined lifecycle — pause, resume, escalate, or abandon.",
    visual: LifecycleVisual,
  },
  {
    name: "Chat-to-Call Escalation",
    icon: IconEscalation,
    description:
      "Start on WhatsApp. If the conversation needs it, relay can escalate to a voice call — same objective, same isolation, same controls.",
    visual: EscalationVisual,
  },
];

/* ── Feature card ── */

function FeatureCard({ feature, index }: { feature: FeatureData; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const staggerDelay = index * 0.12;
  const Icon = feature.icon;
  const Visual = feature.visual;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: staggerDelay, ease: [0.25, 1, 0.5, 1] }}
      whileHover={{ y: -2 }}
      className="group relative bg-glass-bg border border-glass-border backdrop-blur-[12px] p-6 rounded-sm transition-colors duration-300 hover:bg-glass-bg-hover hover:border-[rgba(255,255,255,0.15)]"
    >
      <div className="absolute inset-0 rounded-sm bg-accent-glow opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl -z-10" />

      <div className="flex items-start gap-3 mb-4">
        <div className="shrink-0 mt-0.5 opacity-70 group-hover:opacity-100 transition-opacity duration-300">
          <Icon size={32} />
        </div>
        <div>
          <h3 className="text-sm font-bold">{feature.name}</h3>
          <p className="text-muted text-xs mt-1">{feature.description}</p>
        </div>
      </div>

      <div className="pt-3 border-t border-glass-border">
        <Visual />
      </div>
    </motion.div>
  );
}

/* ── Section ── */

/* ── Floating background mascots ── */

interface FloatingMascotDef {
  x: string;
  y: string;
  size: number;
  opacity: number;
  duration: number;
  delay: number;
  /** Horizontal drift range in px */
  driftX: number;
  /** Vertical drift range in px */
  driftY: number;
  /** Rotation range in degrees */
  rotate: number;
}

const FLOATING_MASCOTS: FloatingMascotDef[] = [
  // Far away — tiny, slow, wide drift
  { x: "3%",  y: "6%",  size: 22, opacity: 0.03, duration: 7,   delay: 0,   driftX: 15, driftY: 10, rotate: 4 },
  { x: "70%", y: "3%",  size: 20, opacity: 0.025, duration: 8,  delay: 2.5, driftX: 20, driftY: 8,  rotate: 5 },
  { x: "92%", y: "50%", size: 24, opacity: 0.03, duration: 6.5, delay: 1,   driftX: 12, driftY: 14, rotate: 3 },

  // Mid distance — medium size, moderate drift
  { x: "8%",  y: "40%", size: 30, opacity: 0.045, duration: 5.5, delay: 0.6, driftX: 10, driftY: 12, rotate: 3 },
  { x: "85%", y: "22%", size: 34, opacity: 0.05,  duration: 5,   delay: 1.2, driftX: 8,  driftY: 10, rotate: 2 },
  { x: "15%", y: "75%", size: 28, opacity: 0.04,  duration: 6,   delay: 1.8, driftX: 14, driftY: 8,  rotate: 4 },
  { x: "50%", y: "90%", size: 26, opacity: 0.035, duration: 5.8, delay: 0.3, driftX: 18, driftY: 6,  rotate: 3 },

  // Closer — larger, subtler drift
  { x: "80%", y: "65%", size: 40, opacity: 0.06,  duration: 4.5, delay: 0.8, driftX: 6,  driftY: 8,  rotate: 2 },
  { x: "5%",  y: "58%", size: 36, opacity: 0.05,  duration: 4.8, delay: 1.5, driftX: 8,  driftY: 10, rotate: 2 },
  { x: "40%", y: "5%",  size: 32, opacity: 0.04,  duration: 5.2, delay: 2,   driftX: 12, driftY: 8,  rotate: 3 },
  { x: "60%", y: "80%", size: 38, opacity: 0.055, duration: 4.2, delay: 0.4, driftX: 10, driftY: 12, rotate: 2 },
  { x: "25%", y: "18%", size: 26, opacity: 0.035, duration: 6.2, delay: 1.6, driftX: 16, driftY: 10, rotate: 4 },
];

function FloatingMascots({ inView }: { inView: boolean }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {FLOATING_MASCOTS.map((m, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{ left: m.x, top: m.y }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={inView ? { opacity: m.opacity, scale: 1 } : {}}
          transition={{ duration: 1.2, delay: m.delay + 0.5, ease: "easeOut" }}
        >
          <motion.div
            animate={{
              x: [-m.driftX, m.driftX, -m.driftX * 0.5, m.driftX * 0.7, -m.driftX],
              y: [-m.driftY, m.driftY * 0.6, -m.driftY * 0.8, m.driftY, -m.driftY],
              rotate: [-m.rotate, m.rotate, -m.rotate * 0.5, m.rotate * 0.8, -m.rotate],
            }}
            transition={{
              duration: m.duration,
              repeat: Infinity,
              ease: "easeInOut",
              delay: m.delay,
            }}
          >
            <CloudMascot size={m.size} disableFloat />
          </motion.div>
        </motion.div>
      ))}
    </div>
  );
}

export function Features() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const sectionInView = useInView(sectionRef, { once: true, margin: "-40px" });

  return (
    <section className="relative px-6 py-20 overflow-hidden" ref={sectionRef}>
      {/* Background floating mascots */}
      <FloatingMascots inView={sectionInView} />

      <div className="relative mx-auto max-w-5xl">
        <motion.h2
          className="text-xl font-bold mb-2"
          initial={{ opacity: 0, y: 12 }}
          animate={sectionInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.4 }}
        >
          features
        </motion.h2>
        <motion.p
          className="text-muted text-sm mb-10"
          initial={{ opacity: 0, y: 12 }}
          animate={sectionInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.4, delay: 0.08 }}
        >
          controlled conversations. structured state. no capability leakage.
        </motion.p>
        <div className="grid md:grid-cols-2 gap-4">
          {FEATURES.map((feature, i) => (
            <FeatureCard key={feature.name} feature={feature} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
