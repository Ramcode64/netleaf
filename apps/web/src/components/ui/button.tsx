import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "ghost" | "outline";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-leaf-500 text-ink-950 hover:bg-leaf-400 font-semibold",
  ghost: "text-ink-100 hover:bg-white/5",
  outline: "border border-white/15 text-ink-50 hover:border-leaf-500/60 hover:bg-white/5",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg transition-colors disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf-500/60";

/**
 * Button styling as a class string — for cases where the element must be an
 * anchor (external links, downloads) rather than a <button>. Avoids the
 * invalid <a><button> nesting that wrapping <Button> in <a> produces (F4-2).
 */
export function buttonClasses(opts?: { variant?: Variant; size?: Size; className?: string }): string {
  return cn(base, variants[opts?.variant ?? "primary"], sizes[opts?.size ?? "md"], opts?.className);
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    />
  )
);
Button.displayName = "Button";
