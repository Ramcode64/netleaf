import { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, and, asc } from "drizzle-orm";
import { createRequire } from "module";
import { Readable } from "stream";
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

  // "]]>" inside a CDATA section terminates it prematurely, enabling XML injection.
  // The safe fix: split the section at every occurrence of "]]>".
  const escapeCdata = (s: string) => s.replace(/]]>/g, "]]]]><![CDATA[>");

  const items = pages
    .map(
      (p) =>
        `  <item>\n    <url>${escape(p.url ?? "")}</url>\n    <title>${escape(p.title ?? "")}</title>\n    <markdown><![CDATA[${escapeCdata(p.markdown ?? "")}]]></markdown>\n  </item>`
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
      if (!z.string().uuid().safeParse(id).success) {
        return reply.status(400).send({ success: false, error: "Invalid crawl job ID" });
      }

      const parsed = ExportQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          error: parsed.error.issues.map((i) => i.message).join(", "),
        });
      }

      const req = request as typeof request & { userId?: string };
      const db = getDb();

      // Ownership predicate — in local mode userId is undefined, so skip the check
      const where = req.userId
        ? and(eq(schema.crawlJobs.id, id), eq(schema.crawlJobs.userId, req.userId))
        : eq(schema.crawlJobs.id, id);

      const job = await db.query.crawlJobs.findFirst({ where });
      if (!job) {
        return reply.status(404).send({ success: false, error: "Crawl job not found" });
      }

      const pages = await db
        .select({
          url: schema.crawlPages.url,
          title: schema.crawlPages.title,
          markdown: schema.crawlPages.markdown,
        })
        .from(schema.crawlPages)
        .where(eq(schema.crawlPages.jobId, id))
        .orderBy(asc(schema.crawlPages.idx));

      const cleanedPages = pages.map((p) => ({
        url: p.url,
        title: p.title ?? undefined,
        markdown: p.markdown ?? undefined,
      }));

      const { format } = parsed.data;

      if (format === "csv") {
        const csv = buildCsv(cleanedPages);
        reply.header("Content-Type", "text/csv");
        reply.header("Content-Disposition", `attachment; filename="crawl-${id}.csv"`);
        return reply.send(csv);
      }

      if (format === "xml") {
        const xml = buildXml(cleanedPages, id);
        reply.header("Content-Type", "application/xml");
        reply.header("Content-Disposition", `attachment; filename="crawl-${id}.xml"`);
        return reply.send(xml);
      }

      // ZIP: one .md file per page
      reply.header("Content-Type", "application/zip");
      reply.header("Content-Disposition", `attachment; filename="crawl-${id}.zip"`);

      const archive = archiver("zip", { zlib: { level: 9 } });
      const rawReply = reply.raw;
      // Abort the archive if the client disconnects mid-stream so we don't
      // keep building a multi-MB ZIP for nobody.
      request.raw.on("close", () => {
        if (rawReply.writableEnded) return;
        try { (archive as unknown as { abort: () => void }).abort(); } catch { /* ignore */ }
      });
      archive.pipe(rawReply);

      for (let i = 0; i < cleanedPages.length; i++) {
        const page = cleanedPages[i];
        const filename = `page-${i + 1}.md`;
        const content = `# ${page.title ?? page.url ?? "Untitled"}\n\n**URL:** ${page.url ?? ""}\n\n${page.markdown ?? ""}`;
        archive.append(Readable.from([content]), { name: filename });
      }

      await archive.finalize();
      return reply;
    }
  );
}
