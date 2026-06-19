/**
 * Returns true when the public API URL points at the operator's own machine
 * (the showcase Vercel deployment ships `localhost:3000` as a placeholder).
 * Used to suppress UI affordances — Try-It, downloads — that won't work
 * from a visitor's browser.
 */
export function isLoopbackApiUrl(apiUrl: string): boolean {
  try {
    const u = new URL(apiUrl);
    const h = u.hostname.toLowerCase();
    return (
      h === "localhost" ||
      h === "127.0.0.1" ||
      h === "0.0.0.0" ||
      h === "::1" ||
      h === "[::1]"
    );
  } catch {
    return false;
  }
}

export function getApiUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
}
