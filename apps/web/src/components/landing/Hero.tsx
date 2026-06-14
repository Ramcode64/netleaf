import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Github, ArrowRight, Shield, Zap, Globe } from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-grid">
      {/* Radial spotlight behind the headline */}
      <div className="pointer-events-none absolute inset-0 hero-glow" />
      {/* Bottom fade into next section */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-ink-950" />

      <div className="relative mx-auto max-w-6xl px-6 pt-24 pb-20 text-center md:pt-32 md:pb-28">
        {/* Badge */}
        <div className="animate-fade-up flex justify-center">
          <Badge tone="leaf" className="mb-8 px-3 py-1 text-xs tracking-wide">
            Open source &nbsp;·&nbsp; MIT licensed &nbsp;·&nbsp; Free forever
          </Badge>
        </div>

        {/* Headline */}
        <h1 className="animate-fade-up text-balance text-5xl font-bold tracking-tight leading-[1.1] md:text-7xl">
          The free, open-source
          <br />
          <span className="text-gradient">web data platform.</span>
        </h1>

        {/* Sub-headline */}
        <p className="animate-fade-up mx-auto mt-7 max-w-2xl text-pretty text-lg leading-relaxed text-ink-300 md:text-xl">
          Scrape, crawl, map, extract, search, and schedule. Multi-LLM structured
          extraction with Claude, OpenAI, or offline Ollama. One command to run
          on your own hardware — no rate limits, no lock-in.
        </p>

        {/* CTAs */}
        <div className="animate-fade-up mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/signup">
            <Button size="lg" className="glow group min-w-[160px] gap-2">
              Start building
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Button>
          </Link>
          <a href="https://github.com/your-username/netleaf" target="_blank" rel="noreferrer">
            <Button variant="outline" size="lg" className="min-w-[160px] gap-2 border-white/10 text-ink-100 hover:border-white/20 hover:text-white">
              <Github className="h-4 w-4" />
              View on GitHub
            </Button>
          </a>
        </div>

        {/* Trust signals */}
        <div className="animate-fade-up mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-ink-300">
          <span className="flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-leaf-400" />
            MIT license
          </span>
          <span className="flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-leaf-400" />
            No rate limits
          </span>
          <span className="flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5 text-leaf-400" />
            Self-hosted in one command
          </span>
        </div>

        {/* Terminal block */}
        <div className="animate-fade-up mx-auto mt-14 max-w-lg rounded-xl border border-white/[0.08] bg-ink-900/70 backdrop-blur shadow-2xl">
          {/* Fake window chrome */}
          <div className="flex items-center gap-1.5 border-b border-white/[0.07] px-4 py-3">
            <span className="h-3 w-3 rounded-full bg-red-500/70" />
            <span className="h-3 w-3 rounded-full bg-yellow-500/70" />
            <span className="h-3 w-3 rounded-full bg-green-500/70" />
            <span className="ml-3 text-xs text-ink-300">Terminal</span>
          </div>
          <div className="p-5 text-left font-mono text-sm leading-relaxed">
            <div>
              <span className="select-none text-ink-300">$ </span>
              <span className="text-leaf-300">docker compose up</span>
            </div>
            <div className="mt-2 text-ink-300">
              <span className="text-leaf-400">✓</span> Postgres ready on :5432
            </div>
            <div className="text-ink-300">
              <span className="text-leaf-400">✓</span> Redis ready on :6379
            </div>
            <div className="text-ink-300">
              <span className="text-leaf-400">✓</span> Migrations applied
            </div>
            <div className="mt-1 text-white">
              <span className="text-leaf-400">→</span> Netleaf API live at{" "}
              <span className="text-leaf-300">http://localhost:3001</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
