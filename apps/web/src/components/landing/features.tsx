import { GlassCard } from "@/components/ui/glass-card";
import { TerminalBlock } from "@/components/ui/terminal-block";

const FEATURES = [
  {
    name: "Interviews",
    description: "Run structured conversations with users via WhatsApp or voice.",
    lines: [
      { prefix: "$", text: 'relay interview start \\' },
      { prefix: " ", text: '--user-id=usr_8123 \\' },
      { prefix: " ", text: '--objective="validate onboarding friction"' },
    ],
  },
  {
    name: "Group Interviews",
    description: "Coordinate multi-user threads with shared context.",
    lines: [
      { prefix: "$", text: 'relay group-interview start \\' },
      { prefix: " ", text: '--group-id=power_users \\' },
      { prefix: " ", text: '--shared-context=product_feedback' },
    ],
  },
  {
    name: "Pull Command",
    description: "Retrieve structured results from any conversation.",
    lines: [
      { prefix: "$", text: 'relay pull --conversation-id=cnv_4421' },
      { prefix: ">", text: '{ "summary": "...", "confidence": 0.82 }' },
    ],
  },
  {
    name: "Logging",
    description: "Every external interaction is traceable and auditable.",
    lines: [
      { prefix: "$", text: 'relay logs --conversation-id=cnv_4421' },
      { prefix: ">", text: "[12 entries] full conversation trace" },
    ],
  },
];

export function Features() {
  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-xl font-bold mb-2">features</h2>
        <p className="text-muted text-sm mb-10">
          controlled conversations. structured output. no capability leakage.
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          {FEATURES.map((feature) => (
            <GlassCard key={feature.name}>
              <h3 className="text-sm font-bold mb-1">{feature.name}</h3>
              <p className="text-muted text-xs mb-4">{feature.description}</p>
              <TerminalBlock lines={feature.lines} />
            </GlassCard>
          ))}
        </div>
      </div>
    </section>
  );
}
