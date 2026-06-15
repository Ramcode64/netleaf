import type { Metadata } from "next";
import Link from "next/link";
import { Github, Leaf } from "lucide-react";
import { DocsSidebar } from "@/components/docs/DocsSidebar";

export const metadata: Metadata = {
  title: "Docs | Netleaf",
  description: "Netleaf documentation — API reference, quick start, and guides.",
};

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-ink-950 text-ink-50">
      {/* Top nav */}
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-ink-950/95 backdrop-blur-sm">
        <div className="flex h-14 items-center gap-4 px-6">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2 transition-opacity hover:opacity-75"
          >
            <Leaf className="h-[15px] w-[15px] text-leaf-400" />
            <span className="text-sm font-semibold tracking-tight text-white">Netleaf</span>
          </Link>

          <span className="h-4 w-px bg-white/10" />
          <span className="text-sm font-medium text-ink-400">Docs</span>

          <div className="flex-1" />

          <nav className="flex items-center gap-5">
            <Link
              href="/"
              className="text-sm text-ink-400 transition-colors hover:text-white"
            >
              ← Home
            </Link>
            <a
              href="https://github.com/Ramcode64/netleaf"
              target="_blank"
              rel="noreferrer"
              aria-label="GitHub"
              className="text-ink-400 transition-colors hover:text-white"
            >
              <Github className="h-[17px] w-[17px]" />
            </a>
            <Link
              href="/dashboard"
              className="rounded-lg bg-leaf-600 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-leaf-500"
            >
              Dashboard
            </Link>
          </nav>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar — fixed, scrolls independently */}
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-60 shrink-0 overflow-y-auto border-r border-white/[0.06] pl-4 lg:block">
          <DocsSidebar />
        </aside>

        {/* Page content */}
        <main className="min-w-0 flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
