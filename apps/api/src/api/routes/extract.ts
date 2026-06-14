import { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireApiKey } from "../middleware/auth.js";
import { extractFromUrl, ExtractError } from "../../services/extract/index.js";
import { httpUrl } from "../../security/validators.js";

const ExtractBodySchema = z.object({
  url: httpUrl(),
  schema: z.record(z.unknown()),
  instructions: z.string().optional(),
  provider: z.enum(["claude", "openai", "ollama"]).optional(),
  waitForSelector: z.string().max(500).optional(),
  timeout: z.number().int().min(1000).max(60000).optional(),
});

export async function extractRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    "/v1/extract",
    { preHandler: requireApiKey },
    async (request, reply) => {
      const parsed = ExtractBodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          error: parsed.error.issues.map((i) => i.message).join(", "),
        });
      }

      try {
        const result = await extractFromUrl(parsed.data);
        return reply.send({
          success: true,
          data: result,
        });
      } catch (err) {
        if (err instanceof ExtractError) {
          return reply.status(err.statusCode).send({
            success: false,
            error: err.message,
          });
        }
        // Don't leak internal error details (LLM API messages, stack traces, etc.)
        request.log.error({ err }, "extract error");
        return reply.status(500).send({
          success: false,
          error: "Extraction failed. Check server logs for details.",
        });
      }
    }
  );
}
