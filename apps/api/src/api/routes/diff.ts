import { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireApiKey } from "../middleware/auth.js";
import { diffJobs } from "../../services/diffService.js";
import { formatZodError } from "../zod-format.js";

const DiffQuerySchema = z.object({
  jobIdA: z.string().uuid("jobIdA must be a valid UUID"),
  jobIdB: z.string().uuid("jobIdB must be a valid UUID"),
});

export async function diffRoutes(app: FastifyInstance): Promise<void> {
  app.get("/v1/diff", { preHandler: requireApiKey }, async (request, reply) => {
    const parsed = DiffQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: formatZodError(parsed.error),
      });
    }

    const { jobIdA, jobIdB } = parsed.data;

    if (jobIdA === jobIdB) {
      return reply.status(400).send({
        success: false,
        error: "jobIdA and jobIdB must be different",
      });
    }

    const req = request as typeof request & { userId?: string };
    const result = await diffJobs({ jobIdA, jobIdB, userId: req.userId });
    if (result === null) {
      return reply.status(404).send({ success: false, error: "One or both crawl jobs not found" });
    }
    return reply.send({ success: true, data: result });
  });
}
