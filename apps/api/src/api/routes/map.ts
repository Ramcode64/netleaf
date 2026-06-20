import { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireApiKey } from "../middleware/auth.js";
import { mapSite, MapStartUrlBlockedError } from "../../services/mapService.js";
import { httpUrl } from "../../security/validators.js";
import { formatZodError } from "../zod-format.js";

const MapBodySchema = z.object({
  url: httpUrl(),
  includeSubdomains: z.boolean().optional().default(false),
  includeExternal: z.boolean().optional().default(false),
  limit: z.number().int().min(1).max(1000).optional().default(100),
});

export async function mapRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    "/v1/map",
    { preHandler: requireApiKey },
    async (request, reply) => {
      const parsed = MapBodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          error: formatZodError(parsed.error),
        });
      }

      const { url, includeSubdomains, includeExternal, limit } = parsed.data;

      try {
        const result = await mapSite({ url, includeSubdomains, includeExternal, limit });
        return reply.send({
          success: true,
          data: {
            links: result.links,
            total: result.total,
            source: result.source,
            ...(result.note ? { note: result.note } : {}),
          },
        });
      } catch (err) {
        // E2-6: SSRF rejection of the start URL surfaces as 422 with the
        // guard's actual reason, not a generic 500 / silent empty list.
        if (err instanceof MapStartUrlBlockedError) {
          return reply.status(422).send({ success: false, error: err.message });
        }
        request.log.error({ err }, "map error");
        return reply.status(500).send({ success: false, error: "Map failed. Check server logs for details." });
      }
    }
  );
}
