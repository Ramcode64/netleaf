"use client";

// Catches errors thrown in the root layout itself. Replaces Next's default
// generic 500 with a branded page that gives the user something to do.
// Must include its own <html> + <body> because the root layout failed to render.
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("global error boundary caught:", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          background: "#0a0a0b",
          color: "#e5e7eb",
          fontFamily: "system-ui, -apple-system, sans-serif",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>Something went wrong</h1>
          <p style={{ color: "#9ca3af", fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
            An unexpected error occurred. Please try again, or return home.
          </p>
          {error.digest && (
            <p style={{ color: "#6b7280", fontFamily: "ui-monospace, monospace", fontSize: 12, marginBottom: 24 }}>
              Reference: {error.digest}
            </p>
          )}
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <button
              onClick={reset}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                background: "#22c55e",
                color: "#0a0a0b",
                fontWeight: 600,
                border: 0,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            <a
              href="/"
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                background: "transparent",
                color: "#e5e7eb",
                border: "1px solid #374151",
                textDecoration: "none",
              }}
            >
              Go home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
