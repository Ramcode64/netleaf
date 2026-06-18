"use client";

import Link from "next/link";
import { Leaf, Github } from "lucide-react";

const links = {
  Product: [
    { label: "Features", href: "#features" },
    { label: "Compare", href: "#compare" },
    { label: "Pricing", href: "#pricing" },
  ],
  Developers: [
    { label: "Docs", href: "/docs" },
    { label: "API Reference", href: "/docs/api" },
    {
      label: "GitHub",
      href: "https://github.com/Ramcode64/netleaf",
      external: true,
    },
  ],
  Account: [
    { label: "Sign in", href: "/login" },
    { label: "Get started", href: "/signup" },
    { label: "Dashboard", href: "/dashboard" },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-ink-100 bg-ink-50">
      <div className="mx-auto max-w-6xl px-6 py-12">
        {/* Top row */}
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <Leaf className="h-4 w-4 text-leaf-600" />
              <span className="text-sm font-semibold text-ink-900">Netleaf</span>
            </div>
            <p className="text-xs leading-relaxed text-ink-400">
              Free, open-source web data platform.
              <br />
              Self-host in one command.
            </p>
            <a
              href="https://github.com/Ramcode64/netleaf"
              target="_blank"
              rel="noreferrer"
              className="mt-4 flex items-center gap-1.5 text-xs text-ink-400 transition-colors hover:text-ink-900"
            >
              <Github className="h-3.5 w-3.5" />
              GitHub
            </a>
          </div>

          {/* Link columns */}
          {Object.entries(links).map(([section, items]) => (
            <div key={section}>
              <h4 className="mb-3 text-xs font-semibold text-ink-900">{section}</h4>
              <ul className="space-y-2.5">
                {items.map((item) =>
                  "external" in item && item.external ? (
                    <li key={item.label}>
                      <a
                        href={item.href}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-ink-400 transition-colors hover:text-ink-900"
                      >
                        {item.label}
                      </a>
                    </li>
                  ) : item.href.startsWith("#") ? (
                    <li key={item.label}>
                      <a
                        href={item.href}
                        className="text-xs text-ink-400 transition-colors hover:text-ink-900"
                        onClick={(e) => {
                          e.preventDefault();
                          history.replaceState(null, "", item.href);
                          document.querySelector(item.href)?.scrollIntoView({ behavior: "smooth" });
                        }}
                      >
                        {item.label}
                      </a>
                    </li>
                  ) : (
                    <li key={item.label}>
                      <Link
                        href={item.href}
                        className="text-xs text-ink-400 transition-colors hover:text-ink-900"
                      >
                        {item.label}
                      </Link>
                    </li>
                  )
                )}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom row */}
        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-ink-100 pt-8 text-xs text-ink-400 sm:flex-row">
          <span>MIT License © {new Date().getFullYear()} Netleaf — Built by Aditya Salgare</span>
          <span>Free, open-source, self-hosted forever.</span>
        </div>
      </div>
    </footer>
  );
}
