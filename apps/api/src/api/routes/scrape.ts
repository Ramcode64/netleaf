import { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireApiKey } from "../middleware/auth.js";
import { withPage } from "../../scraper/browser.js";
import { scrapePage } from "../../scraper/extract.js";
import { httpUrl } from "../../security/validators.js";

const ScrapeBody = z.object({
  url: httpUrl(),
  formats: z.array(z.enum(["markdown", "html", "text"])).optional(),
  waitForSelector: z.string().optional(),
  timeout: z.number().min(1000).max(60000).optional(),
});

export async function scrapeRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    "/v1/scrape",
    { preHandler: requireApiKey },
    async (request, reply) => {
      const parsed = ScrapeBody.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          success: false,
          error: parsed.error.issues.map((i) => i.message).join(", "),
        });
      }

      const result = await withPage((page) =>
        scrapePage(page, parsed.data)
      );

      return reply.code(result.success ? 200 : 422).send({
        success: result.success,
        data: result.success ? result : undefined,
        error: result.error,
      });
    }
  );
}
