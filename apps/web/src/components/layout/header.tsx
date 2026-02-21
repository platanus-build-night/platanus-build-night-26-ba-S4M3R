import Link from "next/link";

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-glass-border bg-[#0a0a0a]/80 backdrop-blur-[12px]">
      <div className="mx-auto max-w-5xl flex items-center justify-between px-6 py-4">
        <Link href="/" className="text-foreground font-mono text-lg font-bold tracking-tight flex items-center gap-2">
          <img src="/relay-mascot.svg" alt="" width={26} height={26} className="shrink-0" />
          relay
        </Link>
        <nav className="flex items-center gap-6">
          <Link
            href="/docs"
            className="text-muted hover:text-foreground transition-colors text-sm"
          >
            docs
          </Link>
          <Link
            href="https://github.com"
            className="text-muted hover:text-foreground transition-colors text-sm"
            target="_blank"
            rel="noopener noreferrer"
          >
            github
          </Link>
          <Link
            href="/docs/quickstart"
            className="text-sm px-3 py-1.5 rounded-sm border border-accent/30 text-accent hover:bg-accent/10 transition-colors"
          >
            quick start
          </Link>
        </nav>
      </div>
    </header>
  );
}
