"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type Token = { text: string; color: string };
type Line = Token[];

function tokenize(code: string): Line[] {
  return code.split("\n").map((line) => {
    const tokens: Token[] = [];

    if (line.trimStart().startsWith("curl")) {
      const parts = line.split(/(curl|-X\s+\w+|localhost:\d+\/\S+|\\)/);
      for (const p of parts) {
        if (!p) continue;
        if (p.startsWith("curl")) tokens.push({ text: p, color: "text-leaf-300" });
        else if (p.startsWith("-X")) tokens.push({ text: p, color: "text-yellow-300/80" });
        else if (p.includes("localhost")) tokens.push({ text: p, color: "text-sky-300/90" });
        else if (p === "\\") tokens.push({ text: p, color: "text-ink-300" });
        else tokens.push({ text: p, color: "text-ink-100" });
      }
      return tokens;
    }

    if (line.trimStart().startsWith("-H") || line.trimStart().startsWith("-d")) {
      tokens.push({ text: line.replace(/(-H|-d)/, "").trimStart(), color: "text-ink-100" });
      tokens.unshift({ text: line.match(/^\s*/)?.[0] ?? "", color: "text-ink-100" });
      tokens.unshift({
        text: line.trimStart().startsWith("-H") ? "  -H " : "  -d ",
        color: "text-yellow-300/80",
      });
      return tokens.slice(2);
    }

    if (/"[^"]+":/.test(line)) {
      const m = line.match(/^(\s*)("([^"]+)")(:\s*)(.*)/);
      if (m) {
        tokens.push({ text: m[1], color: "text-ink-100" });
        tokens.push({ text: m[2], color: "text-violet-300/90" });
        tokens.push({ text: m[4], color: "text-ink-100" });
        const val = m[5].replace(/,\s*$/, "").trim();
        const comma = m[5].endsWith(",") ? "," : "";
        if (val.startsWith('"')) tokens.push({ text: val + comma, color: "text-amber-300/80" });
        else if (val === "true" || val === "false" || val === "null")
          tokens.push({ text: val + comma, color: "text-sky-300/90" });
        else tokens.push({ text: val + comma, color: "text-green-300/80" });
        return tokens;
      }
    }

    tokens.push({ text: line, color: /^[\s{}[\],']*$/.test(line) ? "text-ink-300" : "text-ink-100" });
    return tokens;
  });
}

const examples: Record<string, string> = {
  scrape: `curl -X POST localhost:3000/v1/scrape \\
  -H "Authorization: Bearer nl_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://example.com",
    "formats": ["markdown"]
  }'`,
  extract: `curl -X POST localhost:3000/v1/extract \\
  -H "Authorization: Bearer nl_your_key" \\
  -d '{
    "url": "https://shop.example.com/item",
    "provider": "ollama",
    "schema": {
      "type": "object",
      "properties": {
        "name":  { "type": "string" },
        "price": { "type": "number" }
      }
    }
  }'`,
  schedule: `curl -X POST localhost:3000/v1/schedule \\
  -H "Authorization: Bearer nl_your_key" \\
  -d '{
    "name": "Nightly docs crawl",
    "cronExpression": "0 2 * * *",
    "url": "https://docs.example.com",
    "maxPages": 100
  }'`,
};

const tabLabels: Record<string, string> = {
  scrape: "/v1/scrape",
  extract: "/v1/extract",
  schedule: "/v1/schedule",
};

const bullets = [
  "Bearer token auth — one header, every endpoint",
  "Consistent JSON response envelope everywhere",
  "Webhooks for async crawl job completion",
];

export function CodeDemo() {
  const [active, setActive] = useState<string>("scrape");
  const lines = tokenize(examples[active]);

  return (
    <section className="bg-ink-950 py-32">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          {/* Left: text */}
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-leaf-400">
              Plain HTTP
            </p>
            <h2 className="text-5xl font-bold tracking-tight md:text-6xl">
              A request away
              <br />
              from data.
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-ink-300">
              No SDK required. Works from curl, Python, Go, Node — any
              language that can make an HTTP request.
            </p>
            <ul className="mt-8 space-y-3">
              {bullets.map((b) => (
                <li key={b} className="flex items-start gap-3 text-sm text-ink-300">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-leaf-400" />
                  {b}
                </li>
              ))}
            </ul>
          </div>

          {/* Right: terminal */}
          <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-ink-900/70 shadow-2xl">
            {/* Tab bar */}
            <div className="flex border-b border-white/[0.08] bg-ink-950/40">
              {Object.keys(examples).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActive(tab)}
                  className={cn(
                    "px-5 py-3.5 text-xs font-mono font-medium transition-colors",
                    active === tab
                      ? "border-b-2 border-leaf-400 bg-white/[0.02] text-white"
                      : "text-ink-400 hover:text-white"
                  )}
                >
                  {tabLabels[tab]}
                </button>
              ))}
            </div>
            {/* Code */}
            <div className="overflow-x-auto p-6">
              <pre className="font-mono text-sm leading-relaxed">
                {lines.map((line, i) => (
                  <div key={i}>
                    {line.map((tok, j) => (
                      <span key={j} className={tok.color}>
                        {tok.text}
                      </span>
                    ))}
                  </div>
                ))}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
