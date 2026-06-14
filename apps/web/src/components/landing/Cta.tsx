import Link from "next/link";
import { Github, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Cta() {
  return (
    <section className="bg-ink-950 py-32 text-center">
      <div className="mx-auto max-w-2xl px-6">
        <h2 className="text-5xl font-bold tracking-tight md:text-6xl">
          Start in 30 seconds.
        </h2>
        <p className="mt-6 text-lg text-ink-300">
          No cloud account. No credit card. Just Docker.
        </p>

        {/* Setup commands */}
        <div className="mx-auto mt-12 overflow-hidden rounded-2xl border border-white/[0.08] bg-ink-900/70 text-left shadow-2xl">
          <div className="flex items-center gap-1.5 border-b border-white/[0.07] bg-ink-950/60 px-5 py-3.5">
            <span className="h-3 w-3 rounded-full bg-red-500/70" />
            <span className="h-3 w-3 rounded-full bg-yellow-500/70" />
            <span className="h-3 w-3 rounded-full bg-green-500/70" />
          </div>
          <div className="space-y-2 p-6 font-mono text-sm">
            <div>
              <span className="select-none text-ink-400">$ </span>
              <span className="text-leaf-300">
                git clone https://github.com/Ramcode64/netleaf
              </span>
            </div>
            <div>
              <span className="select-none text-ink-400">$ </span>
              <span className="text-leaf-300">
                cp apps/api/.env.example apps/api/.env
              </span>
            </div>
            <div>
              <span className="select-none text-ink-400">$ </span>
              <span className="text-leaf-300">docker compose up</span>
            </div>
          </div>
        </div>

        {/* CTAs */}
        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link href="/signup">
            <Button size="lg" className="glow gap-2 px-10">
              Create account
              <ArrowRight className="h-4 w-4" />
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
              className="gap-2 border-white/10 px-10 text-ink-200 hover:border-white/20 hover:text-white"
            >
              <Github className="h-4 w-4" />
              View on GitHub
            </Button>
          </a>
        </div>
      </div>
    </section>
  );
}
