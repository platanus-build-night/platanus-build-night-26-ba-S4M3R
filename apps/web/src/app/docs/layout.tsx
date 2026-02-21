import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { source } from "@/lib/source";
import type { ReactNode } from "react";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      tree={source.pageTree}
      nav={{
        title: (
          <span className="flex items-center gap-2 font-mono text-sm font-bold">
            <img src="/relay-mascot.svg" alt="" width={22} height={22} className="shrink-0" />
            relay
          </span>
        ),
        url: "/",
      }}
    >
      {children}
    </DocsLayout>
  );
}
