import {
  FileText,
  Network,
  Map as MapIcon,
  Braces,
  Search,
  CalendarClock,
  GitCompareArrows,
  Leaf,
} from "lucide-react";

const features = [
  {
    icon: FileText,
    title: "Scrape",
    num: "01",
    desc: "Single-page extraction to clean Markdown, HTML, or text. Playwright-powered for JS-heavy sites.",
  },
  {
    icon: Network,
    title: "Crawl",
    num: "02",
    desc: "Recursive site crawls with configurable depth. Async BullMQ queue — survives restarts.",
  },
  {
    icon: MapIcon,
    title: "Map",
    num: "03",
    desc: "Instant URL discovery via sitemaps and link extraction. Returns thousands of URLs in seconds.",
  },
  {
    icon: Braces,
    title: "Extract",
    num: "04",
    desc: "Structured JSON from any page using your own JSON Schema. Choose Claude, OpenAI, or fully offline Ollama.",
  },
  {
    icon: Search,
    title: "Search",
    num: "05",
    desc: "Brave Search integration with optional parallel scraping of every result.",
  },
  {
    icon: CalendarClock,
    title: "Schedule",
    num: "06",
    desc: "Cron-based recurring crawls. Set it once, get fresh data on your own schedule.",
  },
  {
    icon: GitCompareArrows,
    title: "Diff",
    num: "07",
    desc: "Cryptographic change detection between crawl runs. Know exactly what changed and when.",
  },
];

export function Features() {
  return (
    <section id="features" className="bg-ink-50 py-32">
      <div className="mx-auto max-w-6xl px-6">
        {/* Header */}
        <div className="mb-20 text-center">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-leaf-600">
            Ten endpoints
          </p>
          <h2 className="text-balance text-5xl font-bold tracking-tight text-ink-900 md:text-6xl">
            Everything you need
            <br />
            to turn the web into data.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg text-ink-400">
            One self-hosted binary. Zero dollars. No rate limits.
          </p>
        </div>

        {/* Feature cards */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="group rounded-2xl bg-white p-7 ring-1 ring-ink-100 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:ring-ink-200"
            >
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-leaf-50 to-leaf-100">
                <f.icon className="h-5 w-5 text-leaf-600" />
              </div>
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <h3 className="text-base font-semibold text-ink-900">{f.title}</h3>
                <span className="shrink-0 font-mono text-[11px] text-ink-300">{f.num}</span>
              </div>
              <p className="text-sm leading-relaxed text-ink-400">{f.desc}</p>
            </div>
          ))}

          {/* 8th card — open source CTA */}
          <div className="rounded-2xl border-2 border-dashed border-leaf-200 bg-leaf-50/60 p-7">
            <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-leaf-100">
              <Leaf className="h-5 w-5 text-leaf-600" />
            </div>
            <h3 className="mb-2 text-base font-semibold text-ink-900">Open source</h3>
            <p className="text-sm leading-relaxed text-ink-400">
              MIT licensed. Fork it, extend it, or contribute upstream.
            </p>
            <a
              href="https://github.com/Ramcode64/netleaf"
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-block text-sm font-medium text-leaf-600 transition-colors hover:text-leaf-700"
            >
              View on GitHub →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
