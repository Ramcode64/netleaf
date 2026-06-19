import { redirect } from "next/navigation";
import { auth } from "./auth";

/**
 * Resolves the current user's id for a page that requires authentication.
 *
 * Middleware (`proxy.ts`) already redirects unauthenticated requests away from
 * `/dashboard/*`, but a stale JWT or a session callback misconfiguration could
 * still produce a valid-looking session without a `user.id`. Without this
 * guard, every dashboard page does `(session!.user as { id }).id` and crashes
 * with a non-null assertion failure on those edge cases — and the default Next
 * 500 page is the user's only feedback.
 *
 * This helper redirects to /login on any failure path, which the dashboard
 * error boundary can never see. Pages can then just `const userId = await
 * requireUserId();` and treat it as a string.
 */
export async function requireUserId(): Promise<string> {
  const session = await auth();
  const id = (session?.user as { id?: string } | undefined)?.id;
  if (!id) {
    redirect("/login");
  }
  return id;
}
