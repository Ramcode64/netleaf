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
    return value
      ? <Check className="mx-auto h-4 w-4 text-ink-300" />
      : <X className="mx-auto h-4 w-4 text-ink-300/30" />;
  }
  return <span className="text-ink-300">{value}</span>;
}

function NetleafCell({ value }: { value: string | boolean }) {
  if (typeof value === "boolean") {
    return value
      ? <Check className="mx-auto h-4 w-4 text-leaf-400" />
      : <X className="mx-auto h-4 w-4 text-ink-300/30" />;
  }
  return <span className="font-medium text-white">{value}</span>;
}

export function CompareTable() {
  return (
    <section id="compare" className="mx-auto max-w-4xl px-6 py-24">
      <div className="mb-14 text-center">
        <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Netleaf vs Firecrawl</h2>
        <p className="mt-4 text-ink-300">Same job. No lock-in, no meter, no cloud dependency.</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/[0.08]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.08]">
              <th className="bg-ink-900/40 px-5 py-4 text-left font-medium text-ink-300">Feature</th>
              <th className="bg-ink-900/40 px-5 py-4 text-center font-medium text-ink-300">Firecrawl</th>
              {/* Highlighted Netleaf column header */}
              <th className="bg-leaf-950/60 px-5 py-4 text-center">
                <span className="flex items-center justify-center gap-1.5 font-semibold text-leaf-300">
                  <Leaf className="h-3.5 w-3.5" />
                  Netleaf
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.feature} className="border-b border-white/[0.05] last:border-0">
                <td className={`px-5 py-3.5 text-ink-100 ${i % 2 ? "bg-white/[0.01]" : ""}`}>
                  {row.feature}
                </td>
                <td className={`px-5 py-3.5 text-center ${i % 2 ? "bg-white/[0.01]" : ""}`}>
                  <FirecrawlCell value={row.firecrawl} />
                </td>
                {/* Netleaf column always tinted */}
                <td className={`px-5 py-3.5 text-center ${i % 2 ? "bg-leaf-950/30" : "bg-leaf-950/20"}`}>
                  <NetleafCell value={row.netleaf} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
