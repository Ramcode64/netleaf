"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Leaf, LayoutDashboard, KeyRound, Network, CalendarClock, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/api-keys", label: "API Keys", icon: KeyRound },
  { href: "/dashboard/crawls", label: "Crawls", icon: Network },
  { href: "/dashboard/schedules", label: "Schedules", icon: CalendarClock },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardSidebar({
  userEmail,
  signOutAction,
}: {
  userEmail: string;
  signOutAction: () => Promise<void>;
}) {
  const pathname = usePathname();
  return (
    <aside className="hidden w-60 flex-col border-r border-white/10 bg-ink-900/40 p-4 md:flex">
      <Link href="/" className="mb-8 flex items-center gap-2 px-2">
        <Leaf className="h-5 w-5 text-leaf-400" />
        <span className="font-semibold">Netleaf</span>
      </Link>
      <nav className="flex-1 space-y-1">
        {nav.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-leaf-500/10 text-leaf-200"
                  : "text-ink-100 hover:bg-white/5 hover:text-white"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 pt-4">
        <p className="truncate px-3 text-xs text-ink-100/70">{userEmail}</p>
        <form action={signOutAction}>
          <Button variant="ghost" size="sm" className="mt-2 w-full justify-start">
            Sign out
          </Button>
        </form>
      </div>
    </aside>
  );
}

export function DashboardMobileBar({
  userEmail,
  signOutAction,
}: {
  userEmail: string;
  signOutAction: () => Promise<void>;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  const current = nav.find((n) => isActive(pathname, n.href));

  return (
    <div className="sticky top-0 z-40 border-b border-white/10 bg-ink-950/90 backdrop-blur md:hidden">
      <div className="flex h-14 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <Leaf className="h-5 w-5 text-leaf-400" />
          <span className="text-sm font-semibold">Netleaf</span>
        </Link>
        <div className="flex items-center gap-2">
          {current && <span className="text-xs text-ink-100">{current.label}</span>}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-100 hover:bg-white/5"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {open && (
        <div className="border-t border-white/10 px-4 py-3">
          <nav className="space-y-1">
            {nav.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-leaf-500/10 text-leaf-200"
                      : "text-ink-100 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-3 border-t border-white/10 pt-3">
            <p className="truncate px-3 text-xs text-ink-100/70">{userEmail}</p>
            <form action={signOutAction}>
              <Button variant="ghost" size="sm" className="mt-2 w-full justify-start">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
