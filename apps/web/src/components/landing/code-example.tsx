"use client";

import { TerminalBlock } from "@/components/ui/terminal-block";
import { useState } from "react";

export function CodeExample({
  lines,
  className,
}: {
  lines: Array<{ prefix: string; text: string }>;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const text = lines.map((l) => `${l.prefix} ${l.text}`).join("\n");

  function handleCopy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className={`relative group ${className ?? ""}`}>
      <TerminalBlock lines={lines} />
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 text-muted hover:text-foreground text-xs opacity-0 group-hover:opacity-100 transition-opacity bg-[rgba(59,130,246,0.06)] border border-[rgba(59,130,246,0.12)] rounded-sm px-2 py-1"
      >
        {copied ? "copied" : "copy"}
      </button>
    </div>
  );
}
