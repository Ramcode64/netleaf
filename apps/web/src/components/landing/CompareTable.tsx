import { Check, X, Leaf, Minus } from "lucide-react";

type CellValue = string | boolean | "partial";

type Row = {
  feature: string;
  firecrawl: CellValue;
  apify: CellValue;
  diffbot: CellValue;
  scrapingbee: CellValue;
  crawlee: CellValue;
  netleaf: CellValue;
};

const rows: Row[] = [
  {
    feature: "Self-hosted",
    firecrawl: "Complex setup",
    apify: false,
    diffbot: false,
    scrapingbee: false,
    crawlee: "Yes (library)",
    netleaf: "docker compose up",
  },
  {
    feature: "Rate limits",
    firecrawl: "500 credits/mo free",
    apify: "$5 credits/mo free",
    diffbot: "10K calls/mo trial",
    scrapingbee: "1K credits trial",
    crawlee: false,
    netleaf: "None",
  },
  {
    feature: "AI/LLM extraction",
    firecrawl: "Cloud only",
    apify: false,
    diffbot: "Proprietary AI",
    scrapingbee: false,
    crawlee: false,
    netleaf: "Claude · GPT · Ollama",
  },
  {
    feature: "Scheduled crawls",
    firecrawl: false,
    apify: true,
    diffbot: true,
    scrapingbee: false,
    crawlee: false,
    netleaf: true,
  },
  {
    feature: "Change detection",
    firecrawl: false,
    apify: false,
    diffbot: "partial",
    scrapingbee: false,
    crawlee: false,
    netleaf: true,
  },
  {
    feature: "Export formats",
    firecrawl: "Markdown, JSON",
    apify: "JSON, CSV, Excel, XML",
    diffbot: "JSON",
    scrapingbee: "HTML, JSON",
    crawlee: "JSON, CSV",
    netleaf: "JSON · CSV · XML · ZIP",
  },
  {
    feature: "Local-only mode",
    firecrawl: false,
    apify: false,
    diffbot: false,
    scrapingbee: false,
    crawlee: true,
    netleaf: true,
  },
  {
    feature: "Open source",
    firecrawl: "AGPL-3.0",
    apify: "SDK only (MIT)",
    diffbot: false,
    scrapingbee: false,
    crawlee: "Apache 2.0",
    netleaf: "MIT",
  },
  {
    feature: "Pricing",
    firecrawl: "$16 – $333/mo",
    apify: "$49+/mo",
    diffbot: "$299+/mo",
    scrapingbee: "$49+/mo",
    crawlee: "Free",
    netleaf: "Free forever",
  },
];

const competitors = [
  { key: "firecrawl", label: "Firecrawl" },
  { key: "apify",     label: "Apify" },
  { key: "diffbot",   label: "Diffbot" },
  { key: "scrapingbee", label: "ScrapingBee" },
  { key: "crawlee",   label: "Crawlee" },
] as const;

function Cell({ value, highlight = false }: { value: CellValue; highlight?: boolean }) {
  if (value === "partial") {
    return <Minus className="mx-auto h-4 w-4 text-amber-500/70" />;
  }
  if (typeof value === "boolean") {
    return value ? (
      <Check className={`mx-auto h-4 w-4 ${highlight ? "text-leaf-600" : "text-ink-400"}`} />
    ) : (
      <X className="mx-auto h-4 w-4 text-ink-300/30" />
    );
  }
  return (
    <span className={highlight ? "font-semibold text-ink-900" : "text-ink-400"}>
      {value}
    </span>
  );
}

export function CompareTable() {
  return (
    <section id="compare" className="bg-white py-32">
      <div className="mx-auto max-w-6xl px-6">
        {/* Header */}
        <div className="mb-16 text-center">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-leaf-600">
            Compare
          </p>
          <h2 className="text-5xl font-bold tracking-tight text-ink-900 md:text-6xl">
            Netleaf vs the field
          </h2>
          <p className="mt-5 text-xl text-ink-400">
            Same job. No lock-in, no meter, no cloud dependency.
          </p>
        </div>

        {/* Scrollable table wrapper. Sticky first column on mobile keeps the
            feature name in view while scrolling through the competitor columns. */}
        <div className="relative overflow-x-auto rounded-2xl border border-ink-100 shadow-sm">
          <table className="w-full min-w-[780px] text-sm">
            <thead>
              <tr className="border-b border-ink-100 bg-ink-50">
                <th className="sticky left-0 z-10 bg-ink-50 px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-ink-400 w-36">
                  Feature
                </th>
                {/* Netleaf — moved first on the right side of "Feature" so mobile
                    visitors see the highlighted winner column without scrolling. */}
                <th className="bg-leaf-50 px-4 py-4 text-center">
                  <span className="flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-leaf-700">
                    <Leaf className="h-3 w-3" />
                    Netleaf
                  </span>
                </th>
                {competitors.map((c) => (
                  <th
                    key={c.key}
                    className="px-4 py-4 text-center text-xs font-semibold uppercase tracking-wider text-ink-400"
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.feature} className="border-b border-ink-50 last:border-0 bg-white">
                  <td className="sticky left-0 z-10 bg-white px-5 py-3.5 font-medium text-ink-900 whitespace-nowrap">
                    {row.feature}
                  </td>
                  <td className="bg-leaf-50/60 px-4 py-3.5 text-center">
                    <Cell value={row.netleaf} highlight />
                  </td>
                  {competitors.map((c) => (
                    <td key={c.key} className="px-4 py-3.5 text-center">
                      <Cell value={row[c.key]} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footnote — scroll hint visible only on small screens. */}
        <p className="mt-5 text-center text-xs text-ink-400">
          <span className="mr-2 inline-block md:hidden text-leaf-600">← swipe to compare →</span>
          Data accurate as of 2026. Crawlee is an open-source library, not a hosted API — included for reference.
          <span className="ml-2 inline-flex items-center gap-1">
            <Minus className="h-3 w-3 text-amber-500/70" /> = partial support.
          </span>
        </p>
      </div>
    </section>
  );
}
