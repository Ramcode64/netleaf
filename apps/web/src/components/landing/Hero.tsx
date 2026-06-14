import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Github } from "lucide-react";

export function Hero() {
  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-grid pb-24 pt-14">
      {/* Radial glow */}
      <div className="pointer-events-none absolute inset-0 hero-glow" />
      {/* Bottom fade */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-b from-transparent to-ink-950" />

      <div className="relative mx-auto max-w-5xl px-6 text-center">
        {/* Eyebrow */}
        <p
          className="animate-fade-up mb-8 text-xs font-semibold uppercase tracking-[0.2em] text-leaf-400"
          style={{ animationDelay: "0ms" }}
        >
          Open source &nbsp;·&nbsp; MIT licensed &nbsp;·&nbsp; Free forever
        </p>

        {/* Headline — Apple-scale */}
        <h1
          className="animate-fade-up text-balance text-[clamp(52px,10vw,96px)] font-bold leading-[1.04] tracking-tight"
          style={{ animationDelay: "80ms" }}
        >
          Web data.
          <br />
          <span className="text-gradient">On your terms.</span>
        </h1>

        {/* Sub-headline */}
        <p
          className="animate-fade-up mx-auto mt-8 max-w-xl text-lg leading-relaxed text-ink-300 md:text-xl"
          style={{ animationDelay: "160ms" }}
        >
          Scrape, crawl, extract, and schedule with one self-hosted API.
          Multi-LLM support. No rate limits. No cloud bill.
        </p>

        {/* CTAs */}
        <div
          className="animate-fade-up mt-10 flex flex-wrap items-center justify-center gap-4"
          style={{ animationDelay: "240ms" }}
        >
          <Link href="/signup">
            <Button size="lg" className="glow gap-2 px-8">
              Start building
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Button>
          </Link>
          <a
            href="https://github.com/Ramcode64/netleaf"
            target="_blank"
            rel="noreferrer"
          >
            <Button
              variant="outline"
              size="lg"
              className="gap-2 border-white/10 px-8 text-ink-100 hover:border-white/20 hover:text-white"
            >
              <Github className="h-4 w-4" />
              View on GitHub
            </Button>
          </a>
        </div>

        {/* Terminal */}
        <div
          className="animate-fade-up mx-auto mt-20 max-w-2xl"
          style={{ animationDelay: "360ms" }}
        >
          <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-ink-900/80 shadow-2xl backdrop-blur-sm">
            {/* Window chrome */}
            <div className="flex items-center gap-1.5 border-b border-white/[0.07] bg-ink-950/60 px-5 py-3.5">
              <span className="h-3 w-3 rounded-full bg-red-500/70" />
              <span className="h-3 w-3 rounded-full bg-yellow-500/70" />
              <span className="h-3 w-3 rounded-full bg-green-500/70" />
              <span className="ml-4 text-xs text-ink-400">Terminal</span>
            </div>
            {/* Commands */}
            <div className="px-6 py-5 text-left font-mono text-sm leading-7">
              <div>
                <span className="select-none text-ink-400">$ </span>
                <span className="text-leaf-300">
                  git clone https://github.com/Ramcode64/netleaf
                </span>
              </div>
              <div>
                <span className="select-none text-ink-400">$ </span>
                <span className="text-leaf-300">docker compose up</span>
              </div>
              <div className="mt-3 space-y-0.5 text-ink-300">
                <div>
                  <span className="text-leaf-400">✓</span> Postgres ready
                </div>
                <div>
                  <span className="text-leaf-400">✓</span> Redis ready
                </div>
                <div>
                  <span className="text-leaf-400">✓</span> Migrations applied
                </div>
              </div>
              <div className="mt-3 font-medium text-white">
                <span className="text-leaf-400">→</span> API live at{" "}
                <span className="text-leaf-300">http://localhost:3000</span>
              </div>
            </div>
          </div>

          <p className="mt-5 text-center text-sm text-ink-400">
            Or use local mode — no sign-up, no auth. Just curl and go.
          </p>
        </div>
      </div>
    </section>
  );
}
