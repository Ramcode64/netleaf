"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { docsNav, methodBadge, type Method } from "@/lib/docs-nav";
import { cn } from "@/lib/utils";

export function DocsSidebar() {
  const pathname = usePathname();

  return (
    <nav className="py-8 pr-4 pl-1">
      {docsNav.map((section) => (
        <div key={section.heading} className="mb-7">
          <p className="mb-2 pl-3 text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-500">
            {section.heading}
          </p>
          <ul className="space-y-px">
            {section.items.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-3 py-[7px] text-sm transition-colors",
                      isActive
                        ? "bg-white/[0.08] text-white font-medium"
                        : "text-ink-300 hover:bg-white/[0.04] hover:text-ink-100"
                    )}
                  >
                    {item.method && (
                      <span
                        className={cn(
                          "shrink-0 rounded px-[5px] py-px font-mono text-[9px] font-bold leading-4",
                          methodBadge[item.method as Method]
                        )}
                      >
                        {item.method}
                      </span>
                    )}
                    <span className="truncate">{item.title}</span>
                    {isActive && (
                      <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-leaf-400" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
