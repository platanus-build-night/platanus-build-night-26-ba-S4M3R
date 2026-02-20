import { GlassCard } from "@/components/ui/glass-card";
import { TerminalBlock } from "@/components/ui/terminal-block";

const CONSTRAINTS = [
  "no file access",
  "no code execution",
  "no internal APIs",
  "no role escalation",
  "no infrastructure modification",
];

const SCHEMA_LINES = [
  { prefix: " ", text: "{" },
  { prefix: " ", text: '  "objective": "string",' },
  { prefix: " ", text: '  "constraints": [],' },
  { prefix: " ", text: '  "allowed_updates": ["shared_context"]' },
  { prefix: " ", text: "}" },
];

export function SecurityModel() {
  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-xl font-bold mb-2">security model</h2>
        <p className="text-muted text-sm mb-10">
          relay talks. it cannot execute. separation by design.
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          <GlassCard>
            <h3 className="text-sm font-bold mb-4">hard constraints</h3>
            <ul className="space-y-2">
              {CONSTRAINTS.map((c) => (
                <li key={c} className="flex items-center gap-3 text-sm">
                  <span className="text-red-400/80 shrink-0">✕</span>
                  <span className="text-muted">{c}</span>
                </li>
              ))}
            </ul>
          </GlassCard>
          <GlassCard>
            <h3 className="text-sm font-bold mb-4">structured data bridge</h3>
            <p className="text-muted text-xs mb-3">
              core agent communicates with relay via strict schema:
            </p>
            <TerminalBlock lines={SCHEMA_LINES} />
          </GlassCard>
        </div>
      </div>
    </section>
  );
}
