import { Check, X, Leaf } from "lucide-react";

type Row = { feature: string; firecrawl: string | boolean; netleaf: string | boolean };

const rows: Row[] = [
  { feature: "Self-hosted", firecrawl: "Complex setup", netleaf: "docker compose up" },
  { feature: "Rate limits", firecrawl: "Strict free tier", netleaf: "None on self-host" },
  { feature: "LLM provider", firecrawl: "One (locked)", netleaf: "Claude · OpenAI · Ollama" },
  { feature: "Scheduled crawls", firecrawl: false, netleaf: true },
  { feature: "Change detection", firecrawl: false, netleaf: true },
  { feature: "Export formats", firecrawl: "JSON only", netleaf: "JSON · CSV · XML · ZIP" },
  { feature: "Local-only mode", firecrawl: false, netleaf: true },
  { feature: "Price", firecrawl: "$$ at scale", netleaf: "Free forever" },
];

function FirecrawlCell({ value }: { value: string | boolean }) {
  if (typeof value === "boolean") {
    return value ? (
      <Check className="mx-auto h-4 w-4 text-ink-400" />
    ) : (
      <X className="mx-auto h-4 w-4 text-ink-300/30" />
    );
  }
  return <span className="text-ink-400">{value}</span>;
}

function NetleafCell({ value }: { value: string | boolean }) {
  if (typeof value === "boolean") {
    return value ? (
      <Check className="mx-auto h-4 w-4 text-leaf-600" />
    ) : (
      <X className="mx-auto h-4 w-4 text-ink-300/30" />
    );
  }
  return <span className="font-medium text-ink-900">{value}</span>;
}

export function CompareTable() {
  return (
    <section id="compare" className="bg-white py-32">
      <div className="mx-auto max-w-4xl px-6">
        {/* Header */}
        <div className="mb-16 text-center">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-leaf-600">
            Compare
          </p>
          <h2 className="text-5xl font-bold tracking-tight text-ink-900 md:text-6xl">
            Netleaf vs Firecrawl
          </h2>
          <p className="mt-5 text-xl text-ink-400">
            Same job. No lock-in, no meter, no cloud dependency.
          </p>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-ink-100 shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-100 bg-ink-50">
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-ink-400">
                  Feature
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-ink-400">
                  Firecrawl
                </th>
                <th className="bg-leaf-50 px-6 py-4 text-center">
                  <span className="flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-leaf-700">
                    <Leaf className="h-3 w-3" />
                    Netleaf
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.feature} className="border-b border-ink-50 last:border-0">
                  <td className="px-6 py-4 font-medium text-ink-900">{row.feature}</td>
                  <td className="px-6 py-4 text-center">
                    <FirecrawlCell value={row.firecrawl} />
                  </td>
                  <td className="bg-leaf-50/60 px-6 py-4 text-center">
                    <NetleafCell value={row.netleaf} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
