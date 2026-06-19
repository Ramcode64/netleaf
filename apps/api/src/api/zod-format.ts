import type { ZodError } from "zod";

/**
 * Render a Zod validation error into a stable, user-friendly string that
 * includes the field path. Without the path, "Required, Required" is
 * indistinguishable from a single missing field — clients can't tell which
 * fields they need to provide.
 *
 * Format: "name: Required, cronExpression: Required"
 *         "url: Invalid url, maxPages: Number must be less than or equal to 500"
 *         "body: must be object" (when path is empty, e.g. wrong top-level type)
 */
export function formatZodError(error: ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "body";
      return `${path}: ${issue.message}`;
    })
    .join(", ");
}
