import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const included = [
  "All 7 endpoints — unlimited requests",
  "Multi-LLM extraction (Claude · OpenAI · Ollama)",
  "Scheduled crawls + cron management",
  "Cryptographic change detection",
  "CSV · XML · ZIP exports",
  "No rate limits — your hardware, your rules",
  "MIT licensed — fork, extend, ship",
];

export function Pricing() {
  return (
    <section id="pricing" className="mx-auto max-w-2xl px-6 py-24">
      <div className="mb-12 text-center">
        <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Free forever. Always.</h2>
        <p className="mt-4 text-ink-300">
          Self-host on any machine. The only cost is your compute.
        </p>
      </div>

      <div className="relative rounded-2xl border border-leaf-500/25 bg-ink-900/60 p-8 glow">
        {/* Top badge */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="rounded-full border border-leaf-500/30 bg-leaf-950 px-3 py-1 text-xs font-medium text-leaf-400">
            Self-hosted
          </span>
        </div>

        {/* Price */}
        <div className="mt-2 flex items-end gap-2">
          <span className="text-6xl font-bold tracking-tight text-white">$0</span>
          <span className="mb-2 text-ink-300">/ month, forever</span>
        </div>

        <p className="mt-3 text-sm text-ink-300">
          No credit card. No cloud. No vendor account.
        </p>

        <hr className="my-6 border-white/[0.07]" />

        {/* Included features */}
        <ul className="space-y-3">
          {included.map((item) => (
            <li key={item} className="flex items-start gap-3 text-sm">
              <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-leaf-500/15">
                <Check className="h-2.5 w-2.5 text-leaf-400" />
              </span>
              <span className="text-ink-100">{item}</span>
            </li>
          ))}
        </ul>

        <Link href="/signup" className="mt-8 block">
          <Button size="lg" className="w-full gap-2 glow group">
            Get started free
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Button>
        </Link>

        <p className="mt-4 text-center text-xs text-ink-300">
          Or run{" "}
          <code className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-leaf-300">
            docker compose up
          </code>{" "}
          right now — no sign-up needed in local mode.
        </p>
      </div>
    </section>
  );
}
