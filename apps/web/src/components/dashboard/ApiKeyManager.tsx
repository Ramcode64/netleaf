"use client";

import { useState, useTransition } from "react";
import { Copy, Check, Trash2, Plus, KeyRound } from "lucide-react";
import { createApiKey, revokeApiKey, type CreatedKey } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface KeyRow {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: string;
  lastUsedAt: string | null;
}

export function ApiKeyManager({ keys }: { keys: KeyRow[] }) {
  const [name, setName] = useState("");
  const [created, setCreated] = useState<CreatedKey | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const key = await createApiKey(name);
        setCreated(key);
        setName("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create key");
      }
    });
  }

  function copy() {
    if (!created) return;
    navigator.clipboard.writeText(created.rawKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleCreate} className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Key name (e.g. production)"
          className="flex-1 rounded-lg border border-white/10 bg-ink-950 px-3 py-2 text-sm text-white outline-none focus:border-leaf-500/60"
        />
        <Button type="submit" disabled={pending || !name.trim()}>
          <Plus className="h-4 w-4" /> Create key
        </Button>
      </form>
      {error && <p className="text-sm text-red-400">{error}</p>}

      {created && (
        <div className="rounded-lg border border-leaf-500/40 bg-leaf-500/5 p-4">
          <p className="text-sm font-medium text-leaf-300">
            Copy your key now — it won&apos;t be shown again.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 overflow-x-auto rounded bg-ink-950 px-3 py-2 font-mono text-xs text-white">
              {created.rawKey}
            </code>
            <Button variant="outline" size="sm" onClick={copy}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-white/10">
        {keys.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center text-ink-100">
            <KeyRound className="h-8 w-8 opacity-40" />
            <p className="text-sm">No API keys yet. Create one above.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-ink-900/60 text-left text-ink-100">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Prefix</th>
                <th className="px-4 py-3 font-medium">Last used</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <KeyRowItem key={k.id} row={k} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function KeyRowItem({ row }: { row: KeyRow }) {
  const [pending, startTransition] = useTransition();

  return (
    <tr className="border-b border-white/5 last:border-0">
      <td className="px-4 py-3 text-white">{row.name}</td>
      <td className="px-4 py-3">
        <code className="font-mono text-xs text-ink-100">{row.keyPrefix}…</code>
      </td>
      <td className="px-4 py-3 text-ink-100">
        {row.lastUsedAt ? (
          new Date(row.lastUsedAt).toLocaleDateString()
        ) : (
          <Badge tone="muted">Never</Badge>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <Button
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => startTransition(() => revokeApiKey(row.id))}
          className="text-red-300 hover:bg-red-500/10"
        >
          <Trash2 className="h-4 w-4" /> Revoke
        </Button>
      </td>
    </tr>
  );
}
