"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type Token = { text: string; color: string };
type Line = Token[];

// Minimal hand-rolled token colorizer for curl-style JSON
function tokenize(code: string): Line[] {
  return code.split("\n").map((line) => {
    const tokens: Token[] = [];

    // Curl command line
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

    // -H / -d flags
    if (line.trimStart().startsWith("-H") || line.trimStart().startsWith("-d")) {
      tokens.push({ text: line.replace(/(-H|-d)/, "").trimStart(), color: "text-ink-100" });
      tokens.unshift({ text: line.match(/^\s*/)?.[0] ?? "", color: "text-ink-100" });
      tokens.unshift({ text: line.trimStart().startsWith("-H") ? "  -H " : "  -d ", color: "text-yellow-300/80" });
      return tokens.slice(2);
    }

    // JSON keys
    if (/"[^"]+":/.test(line)) {
      const m = line.match(/^(\s*)("([^"]+)")(:\s*)(.*)/);
      if (m) {
        tokens.push({ text: m[1], color: "text-ink-100" });
        tokens.push({ text: m[2], color: "text-violet-300/90" });
        tokens.push({ text: m[4], color: "text-ink-100" });
        // Value
        const val = m[5].replace(/,\s*$/, "").trim();
        const comma = m[5].endsWith(",") ? "," : "";
        if (val.startsWith('"')) tokens.push({ text: val + comma, color: "text-amber-300/80" });
        else if (val === "true" || val === "false" || val === "null") tokens.push({ text: val + comma, color: "text-sky-300/90" });
        else tokens.push({ text: val + comma, color: "text-green-300/80" });
        return tokens;
      }
    }

    // Braces / brackets
    tokens.push({ text: line, color: /^[\s{}[\],']*$/.test(line) ? "text-ink-300" : "text-ink-100" });
    return tokens;
  });
}

const examples: Record<string, string> = {
  scrape: `curl -X POST localhost:3001/v1/scrape \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://example.com",
    "formats": ["markdown", "html"]
  }'`,
  extract: `curl -X POST localhost:3001/v1/extract \\
  -d '{
    "url": "https://shop.example.com/item",
    "provider": "ollama",
    "schema": {
      "type": "object",
      "properties": {
        "name":  { "type": "string" },
        "price": { "type": "number" }
      },
      "required": ["name", "price"]
    }
  }'`,
  schedule: `curl -X POST localhost:3001/v1/schedule \\
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

export function CodeDemo() {
  const [active, setActive] = useState<string>("scrape");
  const lines = tokenize(examples[active]);

  return (
    <section className="mx-auto max-w-4xl px-6 py-24">
      <div className="mb-12 text-center">
        <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
          A request away from data.
        </h2>
        <p className="mt-4 text-ink-300">Plain HTTP. No SDK required. Works from any language.</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-ink-900/70 shadow-2xl">
        {/* Tab bar */}
        <div className="flex border-b border-white/[0.08] bg-ink-950/40">
          {Object.keys(examples).map((tab) => (
            <button
              key={tab}
              onClick={() => setActive(tab)}
              className={cn(
                "px-5 py-3 text-sm font-mono font-medium transition-colors",
                active === tab
                  ? "border-b-2 border-leaf-400 text-white bg-white/[0.03]"
                  : "text-ink-300 hover:text-white"
              )}
            >
              {tabLabels[tab]}
            </button>
          ))}
        </div>

        {/* Code */}
        <div className="overflow-x-auto p-6">
          <pre className="font-mono text-sm leading-[1.75]">
            {lines.map((line, i) => (
              <div key={i}>
                {line.map((tok, j) => (
                  <span key={j} className={tok.color}>{tok.text}</span>
                ))}
              </div>
            ))}
          </pre>
        </div>
      </div>
    </section>
  );
}
