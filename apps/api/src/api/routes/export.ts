import { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { createRequire } from "module";
import { requireApiKey } from "../middleware/auth.js";
import { getDb, schema } from "../../db/client.js";

const require = createRequire(import.meta.url);
const archiver = require("archiver") as (format: string, opts?: object) => {
  on(event: string, handler: (...args: unknown[]) => void): void;
  pipe(dest: unknown): void;
  append(input: NodeJS.ReadableStream, opts: { name: string }): void;
  finalize(): Promise<void>;
};

const ExportQuerySchema = z.object({
  format: z.enum(["csv", "xml", "zip"]).default("csv"),
});

// Neutralize CSV formula injection: a cell beginning with = + - @ (or a control
// char that a spreadsheet may strip to reveal one) is prefixed with a single
// quote so Excel/Sheets treats it as text, not a formula.
function csvCell(value: string): string {
  let v = value ?? "";
  if (/^[=+\-@\t\r]/.test(v)) v = "'" + v;
  return `"${v.replace(/"/g, '""')}"`;
}

function buildCsv(pages: Array<{ url?: string; title?: string; markdown?: string }>): string {
  const header = "url,title,markdown\n";
  const rows = pages.map((p) => {
    return `${csvCell(p.url ?? "")},${csvCell(p.title ?? "")},${csvCell(p.markdown ?? "")}`;
  });
  return header + rows.join("\n");
}

function buildXml(
  pages: Array<{ url?: string; title?: string; markdown?: string }>,
  jobId: string
): string {
  const escape = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const items = pages
    .map(
      (p) =>
        `  <item>\n    <url>${escape(p.url ?? "")}</url>\n    <title>${escape(p.title ?? "")}</title>\n    <markdown><![CDATA[${p.markdown ?? ""}]]></markdown>\n  </item>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<crawl id="${escape(jobId)}">\n${items}\n</crawl>`;
}

export async function exportRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/v1/crawl/:id/export",
    { preHandler: requireApiKey },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const parsed = ExportQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          error: parsed.error.issues.map((i) => i.message).join(", "),
        });
      }

      const req = request as typeof request & { userId?: string };
      const db = getDb();

      // Build ownership predicate — in local mode userId is undefined, so skip the check
      const where = req.userId
        ? and(eq(schema.crawlJobs.id, id), eq(schema.crawlJobs.userId, req.userId))
        : eq(schema.crawlJobs.id, id);

      const job = await db.query.crawlJobs.findFirst({ where });

      if (!job) {
        return reply.status(404).send({ success: false, error: "Crawl job not found" });
      }

      const pages = (job.pages as Array<{ url?: string; title?: string; markdown?: string }>) ?? [];

      const { format } = parsed.data;

      if (format === "csv") {
        const csv = buildCsv(pages);
        reply.header("Content-Type", "text/csv");
        reply.header("Content-Disposition", `attachment; filename="crawl-${id}.csv"`);
        return reply.send(csv);
      }

      if (format === "xml") {
        const xml = buildXml(pages, id);
        reply.header("Content-Type", "application/xml");
        reply.header("Content-Disposition", `attachment; filename="crawl-${id}.xml"`);
        return reply.send(xml);
      }

      // ZIP: one .md file per page
      reply.header("Content-Type", "application/zip");
      reply.header("Content-Disposition", `attachment; filename="crawl-${id}.zip"`);

      const archive = archiver("zip", { zlib: { level: 9 } });

      const rawReply = reply.raw;
      archive.pipe(rawReply);

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const filename = `page-${i + 1}.md`;
        const content = `# ${page.title ?? page.url ?? "Untitled"}\n\n**URL:** ${page.url ?? ""}\n\n${page.markdown ?? ""}`;
        const { Readable } = await import("stream");
        const stream = Readable.from([content]);
        archive.append(stream, { name: filename });
      }

      await archive.finalize();
      return reply;
    }
  );
}
