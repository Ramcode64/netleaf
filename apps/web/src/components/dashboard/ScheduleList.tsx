"use client";

import { useTransition } from "react";
import { Trash2, Power } from "lucide-react";
import { deleteSchedule, toggleSchedule } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface ScheduleRow {
  id: string;
  name: string;
  cronExpression: string;
  nextRunAt: string | null;
  isActive: boolean;
}

export function ScheduleList({ schedules }: { schedules: ScheduleRow[] }) {
  if (schedules.length === 0) {
    return (
      <p className="rounded-xl border border-white/10 py-12 text-center text-sm text-ink-100">
        No scheduled crawls yet. Create one via{" "}
        <code className="font-mono text-leaf-300">POST /v1/schedule</code>.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {schedules.map((s) => (
        <ScheduleItem key={s.id} row={s} />
      ))}
    </div>
  );
}

function ScheduleItem({ row }: { row: ScheduleRow }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-ink-900/40 p-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-white">{row.name}</span>
          <Badge tone={row.isActive ? "leaf" : "muted"}>
            {row.isActive ? "Active" : "Paused"}
          </Badge>
        </div>
        <div className="mt-1 flex flex-wrap gap-x-4 text-xs text-ink-100">
          <span className="font-mono">{row.cronExpression}</span>
          {row.nextRunAt && <span>next: {new Date(row.nextRunAt).toLocaleString()}</span>}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => startTransition(() => toggleSchedule(row.id, !row.isActive))}
        >
          <Power className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => startTransition(() => deleteSchedule(row.id))}
          className="text-red-300 hover:bg-red-500/10"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
