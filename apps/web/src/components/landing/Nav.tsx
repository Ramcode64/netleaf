"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Leaf, Github, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NavItem = { label: string; href: string; link?: boolean };

const items: NavItem[] = [
  { label: "Features", href: "#features" },
  { label: "Compare", href: "#compare" },
  { label: "Pricing", href: "#pricing" },
  { label: "Docs", href: "/docs", link: true },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", handler, { passive: true });
    handler();
    return () => window.removeEventListener("scroll", handler);
  }, []);

  // Lock body scroll while mobile menu is open so the user can't double-scroll behind it.
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  function handleHashClick(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
    // Only intercept when we're on the landing page — otherwise let the browser
    // navigate to "/#section" so the hash works cross-route.
    if (window.location.pathname !== "/") return;
    e.preventDefault();
    history.replaceState(null, "", href);
    document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
    setOpen(false);
  }

  return (
    <header
      className={cn(
        "fixed left-0 right-0 top-0 z-50 transition-all duration-300",
        scrolled || open
          ? "border-b border-white/[0.07] bg-ink-950/90 backdrop-blur-md"
          : "bg-transparent"
      )}
    >
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <Leaf className="h-5 w-5 text-leaf-400" />
          <span className="text-sm font-semibold tracking-tight">Netleaf</span>
        </Link>

        <div className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 md:flex">
          {items.map((item) =>
            item.link ? (
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
                href={`/${item.href}`}
                className="text-sm text-ink-300 transition-colors hover:text-white"
                onClick={(e) => handleHashClick(e, item.href)}
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

        <div className="hidden items-center gap-2 md:flex">
          <Link href="/login">
            <Button variant="ghost" size="sm" className="text-sm text-ink-300 hover:text-white">
              Sign in
            </Button>
          </Link>
          <Link href="/signup">
            <Button size="sm" className="glow-sm rounded-full px-4 text-sm font-semibold">
              Get started
            </Button>
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-100 hover:bg-white/5 md:hidden"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-white/[0.07] bg-ink-950/95 backdrop-blur-md md:hidden">
          <div className="mx-auto flex max-w-6xl flex-col gap-1 px-6 py-4">
            {items.map((item) =>
              item.link ? (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm text-ink-100 hover:bg-white/5 hover:text-white"
                >
                  {item.label}
                </Link>
              ) : (
                <a
                  key={item.label}
                  href={`/${item.href}`}
                  onClick={(e) => handleHashClick(e, item.href)}
                  className="rounded-lg px-3 py-2 text-sm text-ink-100 hover:bg-white/5 hover:text-white"
                >
                  {item.label}
                </a>
              )
            )}
            <a
              href="https://github.com/Ramcode64/netleaf"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink-100 hover:bg-white/5 hover:text-white"
            >
              <Github className="h-4 w-4" /> GitHub
            </a>
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/[0.07] pt-3">
              <Link href="/login" onClick={() => setOpen(false)}>
                <Button variant="ghost" size="sm" className="w-full text-ink-100 hover:text-white">
                  Sign in
                </Button>
              </Link>
              <Link href="/signup" onClick={() => setOpen(false)}>
                <Button size="sm" className="glow-sm w-full rounded-full text-sm font-semibold">
                  Get started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
