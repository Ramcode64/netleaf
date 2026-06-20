"use client";

import { useState, useTransition } from "react";
import { Plus, CalendarClock } from "lucide-react";
import { createSchedule } from "@/lib/actions";
import { Button } from "@/components/ui/button";

const PRESETS: Array<{ label: string; cron: string }> = [
  { label: "Every hour", cron: "0 * * * *" },
  { label: "Every 6 hours", cron: "0 */6 * * *" },
  { label: "Daily 8am", cron: "0 8 * * *" },
  { label: "Weekly Mon 9am", cron: "0 9 * * 1" },
];

export function ScheduleCreateForm() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [cron, setCron] = useState("0 8 * * *");
  const [url, setUrl] = useState("");
  const [maxPages, setMaxPages] = useState("50");
  const [webhookUrl, setWebhookUrl] = useState("");

  function reset() {
    setName("");
    setUrl("");
    setMaxPages("50");
    setWebhookUrl("");
    setCron("0 8 * * *");
    setError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createSchedule({
        name: name.trim(),
        cronExpression: cron.trim(),
        url: url.trim(),
        maxPages: maxPages.trim() || "50",
        webhookUrl: webhookUrl.trim() || undefined,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      reset();
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} className="self-start">
        <Plus className="h-4 w-4" /> New schedule
      </Button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-white/10 bg-ink-900/40 p-5 space-y-4"
    >
      <div className="flex items-center gap-2 text-sm text-ink-100">
        <CalendarClock className="h-4 w-4 text-leaf-400" />
        <span>New scheduled crawl</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" hint="Shown in the schedule list">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Daily competitor scan"
            maxLength={100}
            required
            className={inputClass}
          />
        </Field>
        <Field label="Cron expression" hint="When to run — minimum 5 minutes between runs">
          <input
            value={cron}
            onChange={(e) => setCron(e.target.value)}
            placeholder="0 8 * * *"
            required
            className={`${inputClass} font-mono`}
          />
        </Field>
      </div>

      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => {
          const active = cron.trim() === p.cron;
          return (
            <button
              type="button"
              key={p.cron}
              onClick={() => setCron(p.cron)}
              aria-pressed={active}
              className={
                active
                  ? "rounded-full border border-leaf-500/60 bg-leaf-500/10 px-3 py-1 text-xs text-white"
                  : "rounded-full border border-white/10 px-3 py-1 text-xs text-ink-100 transition-colors hover:border-leaf-500/40 hover:text-white"
              }
            >
              {p.label}
            </button>
          );
        })}
      </div>

      <Field label="Start URL" hint="Where the crawl begins">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          required
          className={inputClass}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Max pages" hint="Cap per crawl (1–1000)">
          <input
            type="number"
            min={1}
            max={1000}
            value={maxPages}
            onChange={(e) => setMaxPages(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Webhook URL" hint="POSTed when crawl completes (optional)">
          <input
            type="url"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="https://your-app.com/hook"
            className={inputClass}
          />
        </Field>
      </div>

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-200">
          {error}
        </p>
      )}

      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            reset();
            setOpen(false);
          }}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create schedule"}
        </Button>
      </div>
    </form>
  );
}

const inputClass =
  "w-full rounded-lg border border-white/10 bg-ink-950 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-leaf-500/60";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium text-white">{label}</span>
        {hint && <span className="text-[10px] text-ink-100/60">{hint}</span>}
      </div>
      {children}
    </label>
  );
}
