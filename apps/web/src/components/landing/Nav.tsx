"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Leaf, Github } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", handler, { passive: true });
    handler();
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <header
      className={cn(
        "fixed left-0 right-0 top-0 z-50 transition-all duration-300",
        scrolled
          ? "border-b border-white/[0.07] bg-ink-950/90 backdrop-blur-md"
          : "bg-transparent"
      )}
    >
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <Leaf className="h-5 w-5 text-leaf-400" />
          <span className="text-sm font-semibold tracking-tight">Netleaf</span>
        </Link>

        {/* Center links */}
        <div className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 md:flex">
          {[
            { label: "Features", href: "#features" },
            { label: "Compare", href: "#compare" },
            { label: "Pricing", href: "#pricing" },
            { label: "Docs", href: "/docs", link: true },
          ].map((item) =>
            "link" in item ? (
              <Link
                key={item.label}
                href={item.href}
                className="text-sm text-ink-300 transition-colors hover:text-white"
              >
                {item.label}
              </Link>
            ) : (
              <a
                key={item.label}
                href={item.href}
                className="text-sm text-ink-300 transition-colors hover:text-white"
              >
                {item.label}
              </a>
            )
          )}
          <a
            href="https://github.com/Ramcode64/netleaf"
            target="_blank"
            rel="noreferrer"
            className="text-ink-300 transition-colors hover:text-white"
            aria-label="GitHub"
          >
            <Github className="h-4 w-4" />
          </a>
        </div>

        {/* Right CTAs */}
        <div className="flex items-center gap-2">
          <Link href="/login">
            <Button variant="ghost" size="sm" className="text-ink-300 hover:text-white">
              Sign in
            </Button>
          </Link>
          <Link href="/signup">
            <Button size="sm" className="glow-sm">Get started</Button>
          </Link>
        </div>
      </nav>
    </header>
  );
}
