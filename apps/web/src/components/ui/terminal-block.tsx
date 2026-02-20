export function TerminalBlock({
  lines,
  className,
}: {
  lines: Array<{ prefix: string; text: string }>;
  className?: string;
}) {
  return (
    <div
      className={`bg-[#111] border border-glass-border rounded-sm p-4 font-mono text-sm ${className ?? ""}`}
    >
      {lines.map((line, i) => (
        <div key={i} className="flex gap-2">
          <span className="text-muted select-none shrink-0">{line.prefix}</span>
          <span className="text-foreground">{line.text}</span>
        </div>
      ))}
    </div>
  );
}
