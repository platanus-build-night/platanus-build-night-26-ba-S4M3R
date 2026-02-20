export function GlassCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-glass-bg border border-glass-border backdrop-blur-[12px] p-6 rounded-sm ${className ?? ""}`}
    >
      {children}
    </div>
  );
}
