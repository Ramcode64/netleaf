import { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireApiKey } from "../middleware/auth.js";
import { search } from "../../services/searchService.js";
import { formatZodError } from "../zod-format.js";

const SearchBodySchema = z.object({
  query: z.string().min(1, "query must not be empty").max(500, "query must be at most 500 characters"),
  maxResults: z.number().int().min(1).max(10).optional().default(5),
  scrape: z.boolean().optional().default(true),
  formats: z
    .array(z.enum(["markdown", "html", "text"]))
    .optional()
    .default(["markdown"]),
});

export async function searchRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    "/v1/search",
    { preHandler: requireApiKey },
    async (request, reply) => {
      const parsed = SearchBodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          error: formatZodError(parsed.error),
        });
      }

      try {
        const result = await search(parsed.data);
        return reply.send({ success: true, data: result });
      } catch (err) {
        const message = err instanceof Error ? err.message : "";
        const isMissingKey = message.includes("not configured");
        request.log.error({ err }, "search error");
        return reply.status(isMissingKey ? 400 : 502).send({
          success: false,
          error: isMissingKey
            ? "Search is not configured. Set BRAVE_API_KEY (free key at https://api.search.brave.com/). See /docs/search."
            : "Search failed. Check server logs for details.",
        });
      }
    }
  );
}
