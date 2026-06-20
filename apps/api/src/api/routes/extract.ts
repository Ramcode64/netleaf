import { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireApiKey } from "../middleware/auth.js";
import { extractFromUrl, ExtractError } from "../../services/extract/index.js";
import { httpUrl } from "../../security/validators.js";
import { formatZodError } from "../zod-format.js";

// Guard against AJV complexity DoS: limit the serialised schema size.
// A valid JSON Schema for extraction needs at most a few KB.
const MAX_SCHEMA_JSON_BYTES = 16 * 1024; // 16 KB

const ExtractBodySchema = z.object({
  url: httpUrl(),
  schema: z
    .record(z.unknown())
    .refine(
      (v) => JSON.stringify(v).length <= MAX_SCHEMA_JSON_BYTES,
      `schema must be at most ${MAX_SCHEMA_JSON_BYTES} bytes when serialised`
    ),
  instructions: z.string().max(4096).optional(),
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
          error: formatZodError(parsed.error),
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
          // 400 (bad schema) and 422 (scrape failed) are client errors — safe to return as-is.
          // 502 means all LLM providers failed; their raw error messages can leak API key
          // status, rate-limit info, or model names. Log internally and return a generic message.
          if (err.statusCode === 502) {
            request.log.error({ err }, "extract provider error");
            // Don't echo raw provider errors (may leak key status / model names),
            // but name the setup path — the #1 first-run confusion is not knowing
            // whether the feature is broken or just unconfigured.
            return reply.status(502).send({
              success: false,
              error:
                "Extraction failed: no LLM provider succeeded. Configure one — set ANTHROPIC_API_KEY or OPENAI_API_KEY, or run Ollama (OLLAMA_URL). See /docs/extract. Full error in server logs.",
            });
          }
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
