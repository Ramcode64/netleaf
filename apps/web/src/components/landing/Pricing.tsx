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
    <section id="pricing" className="bg-ink-50 py-32">
      <div className="mx-auto max-w-2xl px-6 text-center">
        {/* Header */}
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-leaf-600">
          Pricing
        </p>
        <h2 className="text-5xl font-bold tracking-tight text-ink-900 md:text-6xl">
          Free. Forever.
        </h2>
        <p className="mt-5 text-xl text-ink-400">
          Self-host on any machine. The only cost is your compute.
        </p>

        {/* Big $0 */}
        <div className="my-16">
          <span className="text-gradient-dark text-[clamp(96px,20vw,160px)] font-bold leading-none">
            $0
          </span>
          <p className="mt-3 text-ink-400">per month. For everything. Always.</p>
        </div>

        {/* Feature list card */}
        <div className="rounded-2xl bg-white p-8 text-left shadow-sm">
          <ul className="space-y-4">
            {included.map((item) => (
              <li key={item} className="flex items-center gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-leaf-100">
                  <Check className="h-3 w-3 text-leaf-600" />
                </span>
                <span className="text-sm text-ink-900">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* CTA */}
        <Link href="/signup" className="mt-8 block">
          <Button size="lg" className="glow w-full gap-2">
            Get started — it&apos;s free
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>

        <p className="mt-5 text-sm text-ink-400">
          No credit card required.{" "}
          <code className="rounded-md bg-ink-100 px-1.5 py-0.5 font-mono text-xs text-leaf-700">
            docker compose up
          </code>{" "}
          and you&apos;re running.
        </p>
      </div>
    </section>
  );
}
