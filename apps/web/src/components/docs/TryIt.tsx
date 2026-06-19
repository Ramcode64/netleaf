"use client";

import { useState } from "react";
import { Terminal } from "lucide-react";
import type { EndpointDoc } from "@/lib/endpoints";
import { Button } from "@/components/ui/button";
import { isLoopbackApiUrl } from "@/lib/api-url";

interface TryItProps {
  endpoint: EndpointDoc;
  apiUrl: string;
}

// The Vercel showcase ships NEXT_PUBLIC_API_URL=http://localhost:3000 as a
// placeholder — visitor browsers can't reach the operator's local API. Pick
// the right component up-front so the inner form's hooks stay unconditional.
export function TryIt({ endpoint, apiUrl }: TryItProps) {
  if (isLoopbackApiUrl(apiUrl)) return <TryItUnavailable />;
  return <TryItForm endpoint={endpoint} apiUrl={apiUrl} />;
}

function TryItUnavailable() {
  return (
    <div className="mt-8 rounded-xl border border-white/10 bg-ink-900/40 p-6">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-leaf-400">Try it</h3>
      <div className="mt-4 flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-100">
        <Terminal className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="font-medium">Live preview only works when the API is running on your machine.</p>
          <p className="mt-1 text-amber-100/80">
            Run <code className="rounded bg-ink-950 px-1.5 py-0.5 font-mono text-xs">docker compose up</code>{" "}
            and the Try-It panel will become interactive. Until then, copy the curl example below.
          </p>
        </div>
      </div>
    </div>
  );
}

function TryItForm({ endpoint, apiUrl }: TryItProps) {
  const [apiKey, setApiKey] = useState("");
  const [body, setBody] = useState(endpoint.exampleRequest ?? "");
  const [jobId, setJobId] = useState("");
  // Query param values for GET endpoints (keyed by param name)
  const [queryValues, setQueryValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<{ status: number; body: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const needsJobId = endpoint.path.includes(":id");

  // GET endpoints that have queryParams need input fields (e.g. diff)
  const getQueryParams = endpoint.method === "GET" ? (endpoint.queryParams ?? []) : [];
  // Filter out `:id` path params — those are handled by jobId field
  const fillableQueryParams = getQueryParams.filter((p) => !endpoint.path.includes(`:${p.name}`));

  function buildUrl(): string {
    let path = endpoint.path;
    if (needsJobId) path = path.replace(":id", jobId || ":id");

    const params = new URLSearchParams();
    // For export, default format
    if (endpoint.id === "export") params.set("format", queryValues["format"] ?? "csv");
    // For any endpoint with fillable GET query params, add them
    for (const p of fillableQueryParams) {
      const val = queryValues[p.name];
      if (val) params.set(p.name, val);
    }

    const qs = params.toString();
    return `${apiUrl}${path}${qs ? `?${qs}` : ""}`;
  }

  async function run() {
    setLoading(true);
    setResponse(null);
    setError(null);

    try {
      const url = buildUrl();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

      const res = await fetch(url, {
        method: endpoint.method,
        headers,
        body: endpoint.method !== "GET" && body ? body : undefined,
      });

      const text = await res.text();
      let formatted = text;
      try {
        formatted = JSON.stringify(JSON.parse(text), null, 2);
      } catch {}

      setResponse({ status: res.status, body: formatted });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  const resolvedPath = endpoint.path.replace(":id", jobId || ":id");

  return (
    <div className="mt-8 rounded-xl border border-white/10 bg-ink-900/40 p-6">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-leaf-400">Try it</h3>

      <div className="mt-4 space-y-3">
        {/* API key */}
        <div>
          <label className="mb-1 block text-xs text-ink-100">
            API Key{" "}
            <span className="text-ink-300">(leave blank if LOCAL_MODE=true)</span>
          </label>
          <input
            type="password"
            placeholder="nl_…"
            value={apiKey}
            autoComplete="off"
            onChange={(e) => setApiKey(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-ink-950 px-3 py-2 font-mono text-sm text-white placeholder-ink-300 focus:border-leaf-500/60 focus:outline-none"
          />
        </div>

        {/* Job/Schedule ID for paths with :id */}
        {needsJobId && (
          <div>
            <label className="mb-1 block text-xs text-ink-100">Job / Schedule ID</label>
            <input
              type="text"
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              value={jobId}
              onChange={(e) => setJobId(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-ink-950 px-3 py-2 font-mono text-sm text-white placeholder-ink-300 focus:border-leaf-500/60 focus:outline-none"
            />
          </div>
        )}

        {/* Fillable query params for GET endpoints (e.g. diff's jobIdA / jobIdB) */}
        {fillableQueryParams.map((p) => (
          <div key={p.name}>
            <label className="mb-1 block text-xs text-ink-100">
              <code className="text-leaf-300">{p.name}</code>
              {p.required && <span className="ml-1 text-red-400">*</span>}
              <span className="ml-2 text-ink-300">{p.description}</span>
            </label>
            <input
              type="text"
              placeholder={p.default ?? p.type}
              value={queryValues[p.name] ?? ""}
              onChange={(e) =>
                setQueryValues((prev) => ({ ...prev, [p.name]: e.target.value }))
              }
              className="w-full rounded-lg border border-white/10 bg-ink-950 px-3 py-2 font-mono text-sm text-white placeholder-ink-300 focus:border-leaf-500/60 focus:outline-none"
            />
          </div>
        ))}

        {/* Export format selector */}
        {endpoint.id === "export" && (
          <div>
            <label className="mb-1 block text-xs text-ink-100">format</label>
            <select
              value={queryValues["format"] ?? "csv"}
              onChange={(e) => setQueryValues((prev) => ({ ...prev, format: e.target.value }))}
              className="rounded-lg border border-white/10 bg-ink-950 px-3 py-2 text-sm text-white focus:border-leaf-500/60 focus:outline-none"
            >
              <option value="csv">csv</option>
              <option value="xml">xml</option>
              <option value="zip">zip</option>
            </select>
          </div>
        )}

        {/* Request body for non-GET */}
        {endpoint.method !== "GET" && (
          <div>
            <label className="mb-1 block text-xs text-ink-100">Request body (JSON)</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              spellCheck={false}
              className="w-full rounded-lg border border-white/10 bg-ink-950 px-3 py-2 font-mono text-xs text-white placeholder-ink-300 focus:border-leaf-500/60 focus:outline-none"
            />
          </div>
        )}

        <div className="flex items-center gap-3">
          <Button onClick={run} disabled={loading} size="sm">
            {loading ? "Sending…" : `${endpoint.method} ${resolvedPath}`}
          </Button>
          <span className="font-mono text-xs text-ink-300">{apiUrl}</span>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-500/30 bg-red-950/30 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {response && (
        <div className="mt-4">
          <div className="mb-1 flex items-center gap-2">
            <span
              className={`rounded px-2 py-0.5 text-xs font-semibold ${
                response.status < 300
                  ? "bg-leaf-900/60 text-leaf-300"
                  : response.status < 400
                  ? "bg-amber-900/60 text-amber-300"
                  : "bg-red-900/60 text-red-300"
              }`}
            >
              {response.status}
            </span>
            <span className="text-xs text-ink-300">Response</span>
          </div>
          <pre className="max-h-80 overflow-auto rounded-lg bg-ink-950 p-4 font-mono text-xs text-leaf-100">
            <code>{response.body}</code>
          </pre>
        </div>
      )}
    </div>
  );
}
