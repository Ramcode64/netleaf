"use client";

// Catches errors thrown by any dashboard route segment — DB timeouts, expired
// sessions, malformed query results. The dashboard layout still renders
// (sidebar + sign-out remain available); only the main pane is replaced.
import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("dashboard error boundary caught:", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-2xl py-12">
      <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-8 text-center">
        <AlertTriangle className="mx-auto h-10 w-10 text-red-300" />
        <h1 className="mt-4 text-xl font-semibold">Something went wrong loading this page</h1>
        <p className="mt-2 text-sm text-ink-100">
          This is usually a transient database or session issue. Try reloading; if it persists,
          sign out and back in.
        </p>
        {error.digest && (
          <p className="mt-3 font-mono text-xs text-ink-100/60">Reference: {error.digest}</p>
        )}
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button onClick={reset}>Try again</Button>
          <Link href="/dashboard">
            <Button variant="ghost">Back to overview</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
