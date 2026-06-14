import { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireApiKey } from "../middleware/auth.js";
import { mapSite } from "../../services/mapService.js";
import { httpUrl } from "../../security/validators.js";

const MapBodySchema = z.object({
  url: httpUrl(),
  includeSubdomains: z.boolean().optional().default(false),
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
          error: parsed.error.issues.map((i) => i.message).join(", "),
        });
      }

      const { url, includeSubdomains, limit } = parsed.data;

      try {
        const result = await mapSite({ url, includeSubdomains, limit });
        return reply.send({
          success: true,
          data: {
            links: result.links,
            total: result.total,
            source: result.source,
          },
        });
      } catch (err) {
        request.log.error({ err }, "map error");
        return reply.status(500).send({ success: false, error: "Map failed. Check server logs for details." });
      }
    }
  );
}
