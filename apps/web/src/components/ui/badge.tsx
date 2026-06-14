import * as React from "react";
import { cn } from "@/lib/utils";

type Tone = "leaf" | "muted" | "amber" | "red";

const tones: Record<Tone, string> = {
  leaf: "bg-leaf-500/15 text-leaf-300 border-leaf-500/30",
  muted: "bg-white/5 text-ink-100 border-white/10",
  amber: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  red: "bg-red-500/15 text-red-300 border-red-500/30",
};

export function Badge({
  tone = "muted",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        tones[tone],
        className
      )}
      {...props}
    />
  );
}
