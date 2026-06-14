import Link from "next/link";
import { Leaf, Github } from "lucide-react";

const links = {
  Product: [
    { label: "Features", href: "#features" },
    { label: "vs Firecrawl", href: "#compare" },
    { label: "Pricing", href: "#pricing" },
  ],
  Developers: [
    { label: "Docs", href: "/docs" },
    { label: "API Reference", href: "/docs/api" },
    { label: "GitHub", href: "https://github.com/your-username/netleaf", external: true },
  ],
  Account: [
    { label: "Sign in", href: "/login" },
    { label: "Get started", href: "/signup" },
    { label: "Dashboard", href: "/dashboard" },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-white/[0.06]">
      <div className="mx-auto max-w-6xl px-6 py-14">
        {/* Top row */}
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2">
              <Leaf className="h-5 w-5 text-leaf-400" />
              <span className="text-base font-semibold tracking-tight">Netleaf</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-ink-300">
              Free, open-source web data platform. Self-host in one command.
            </p>
            <a
              href="https://github.com/your-username/netleaf"
              target="_blank"
              rel="noreferrer"
              className="mt-4 flex items-center gap-1.5 text-sm text-ink-300 transition-colors hover:text-white"
            >
              <Github className="h-4 w-4" />
              GitHub
            </a>
          </div>

          {/* Link columns */}
          {Object.entries(links).map(([section, items]) => (
            <div key={section}>
              <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-ink-300/60">
                {section}
              </h4>
              <ul className="space-y-3">
                {items.map((item) => (
                  <li key={item.label}>
                    {"external" in item && item.external ? (
                      <a
                        href={item.href}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-ink-300 transition-colors hover:text-white"
                      >
                        {item.label}
                      </a>
                    ) : (
                      <Link
                        href={item.href}
                        className="text-sm text-ink-300 transition-colors hover:text-white"
                      >
                        {item.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom row */}
        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/[0.06] pt-8 text-xs text-ink-300/60 sm:flex-row">
          <span>MIT License © {new Date().getFullYear()} Netleaf</span>
          <span>Free, open-source, self-hosted forever.</span>
        </div>
      </div>
    </footer>
  );
}
