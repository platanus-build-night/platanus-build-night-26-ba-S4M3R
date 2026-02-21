"use client";

import { useState, useCallback } from "react";

export function CopyForAgents({ slug }: { slug: string }) {
  const [state, setState] = useState<"idle" | "copying" | "copied">("idle");

  const handleCopy = useCallback(async () => {
    setState("copying");
    try {
      // Fetch the raw markdown from the API
      const mdPath = slug ? `/api/docs/${slug}.md` : "/api/docs/index.md";
      const res = await fetch(mdPath);
      if (!res.ok) throw new Error("Failed to fetch");
      const md = await res.text();

      await navigator.clipboard.writeText(md);
      setState("copied");
      setTimeout(() => setState("idle"), 2000);
    } catch {
      setState("idle");
    }
  }, [slug]);

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded-sm border transition-all duration-200 cursor-pointer"
      style={{
        background:
          state === "copied"
            ? "rgba(59, 130, 246, 0.08)"
            : "rgba(255, 255, 255, 0.03)",
        borderColor:
          state === "copied"
            ? "rgba(59, 130, 246, 0.3)"
            : "rgba(255, 255, 255, 0.1)",
        color: state === "copied" ? "#3B82F6" : "#9A9590",
      }}
      disabled={state === "copying"}
    >
      {state === "copied" ? (
        <>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          copied
        </>
      ) : (
        <>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          copy for agents
        </>
      )}
    </button>
  );
}
