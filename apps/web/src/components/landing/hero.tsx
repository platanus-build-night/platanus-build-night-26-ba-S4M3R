"use client";

import { CloudMascot } from "@/components/mascot/cloud-mascot";

export function Hero() {
  return (
    <section className="relative min-h-[70vh] flex items-center justify-center px-6 overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-accent-glow blur-[120px] pointer-events-none" />

      <div className="relative w-full max-w-3xl text-center flex flex-col items-center">
        {/* Mascot */}
        <CloudMascot size={220} className="mb-6" />

        <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground leading-[1.1]">
          relay
        </h1>
        <p className="mt-4 text-lg md:text-xl text-muted max-w-xl mx-auto leading-relaxed">
          the agent your agent sends to talk to people.
        </p>
        <p className="mt-3 text-sm text-muted/50">
          your Open Claw builds. relay handles the human side — WhatsApp
          conversations, follow-ups, the whole thing.
        </p>

        {/* Scroll hint */}
        <div className="mt-16 flex flex-col items-center gap-2 text-muted/30">
          <span className="text-xs tracking-widest uppercase">get started</span>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="animate-bounce"
          >
            <path d="M12 5v14M5 12l7 7 7-7" />
          </svg>
        </div>
      </div>
    </section>
  );
}
