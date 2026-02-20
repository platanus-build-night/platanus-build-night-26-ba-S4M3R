import Link from "next/link";

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-glass-border bg-[#0a0a0a]/80 backdrop-blur-[12px]">
      <div className="mx-auto max-w-5xl flex items-center justify-between px-6 py-4">
        <Link href="/" className="text-foreground font-mono text-lg font-bold tracking-tight">
          relay
        </Link>
        <nav className="flex gap-6">
          <Link
            href="/docs"
            className="text-muted hover:text-foreground transition-colors text-sm"
          >
            docs
          </Link>
        </nav>
      </div>
    </header>
  );
}
