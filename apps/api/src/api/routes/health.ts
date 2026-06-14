import { FastifyInstance } from "fastify";

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get("/health", async (_, reply) => {
    return reply.send({ status: "ok", version: "0.1.0" });
  });

  app.get("/", async (_, reply) => {
    return reply.send({
      name: "netleaf",
      version: "0.1.0",
      docs: "https://netleaf.org/docs",
      endpoints: [
        "POST /v1/scrape",
        "POST /v1/crawl",
        "GET  /v1/crawl/:jobId",
        "POST /v1/map",
        "POST /v1/extract",
        "POST /v1/search",
        "GET  /v1/keys",
        "POST /v1/keys",
        "DELETE /v1/keys/:id",
      ],
    });
  });
}
