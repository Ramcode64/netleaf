import {
  FileText,
  Network,
  Map as MapIcon,
  Braces,
  Search,
  CalendarClock,
  GitCompareArrows,
} from "lucide-react";

const features = [
  {
    icon: FileText,
    title: "Scrape",
    desc: "Single-page extraction to clean Markdown, HTML, links, or raw text. Playwright-powered for JS-heavy sites.",
    num: "01",
  },
  {
    icon: Network,
    title: "Crawl",
    desc: "Recursive site crawls with configurable depth, concurrency, and an async BullMQ job queue. Survives restarts.",
    num: "02",
  },
  {
    icon: MapIcon,
    title: "Map",
    desc: "Instant URL discovery via robots.txt, XML sitemaps, and fallback link extraction. Returns thousands of URLs in seconds.",
    num: "03",
  },
  {
    icon: Braces,
    title: "Extract",
    desc: "Structured JSON from any page using your own JSON Schema. Choose Claude, OpenAI, or fully offline Ollama.",
    num: "04",
  },
  {
    icon: Search,
    title: "Search",
    desc: "Brave Search integration with optional parallel scraping of every result. Structured output from live web results.",
    num: "05",
  },
  {
    icon: CalendarClock,
    title: "Schedule",
    desc: "Cron-based recurring crawls, managed in-process. Set it up once and get fresh data on your own schedule.",
    num: "06",
  },
  {
    icon: GitCompareArrows,
    title: "Diff",
    desc: "Cryptographic change detection between crawl runs, per page. Know exactly what changed, and when.",
    num: "07",
  },
];

export function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-6 py-24">
      <div className="mb-14 text-center">
        <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
          Everything Firecrawl does.{" "}
          <span className="text-gradient">And more.</span>
        </h2>
        <p className="mt-4 text-ink-300">Seven endpoints. One self-hosted binary. Zero dollars.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <div
            key={f.title}
            className="group relative rounded-xl border border-white/[0.07] bg-ink-900/40 p-6
                       transition-all duration-300 hover:border-leaf-500/30 hover:bg-ink-900/60 hover:glow-sm"
          >
            {/* Number accent */}
            <div className="mb-4 flex items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-leaf-500/20 bg-leaf-950/60">
                <f.icon className="h-4.5 w-4.5 text-leaf-400" />
              </div>
              <span className="font-mono text-xs text-ink-300/50 select-none">{f.num}</span>
            </div>
            <h3 className="text-base font-semibold text-white">{f.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-300">{f.desc}</p>
          </div>
        ))}

        {/* Spacer card — "open source" CTA */}
        <div className="flex flex-col items-start justify-between rounded-xl border border-dashed border-white/[0.07] bg-transparent p-6">
          <p className="text-sm leading-relaxed text-ink-300">
            Netleaf is MIT-licensed and fully open source. Fork it, extend it, or contribute upstream.
          </p>
          <a
            href="https://github.com/your-username/netleaf"
            target="_blank"
            rel="noreferrer"
            className="mt-4 text-sm font-medium text-leaf-400 hover:text-leaf-300 transition-colors"
          >
            View source on GitHub →
          </a>
        </div>
      </div>
    </section>
  );
}
