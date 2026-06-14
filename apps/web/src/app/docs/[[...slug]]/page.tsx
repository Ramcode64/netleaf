import Link from "next/link";
import { notFound } from "next/navigation";
import { Leaf, ChevronRight } from "lucide-react";
import { endpoints, getEndpoint } from "@/lib/endpoints";
import { TryIt } from "@/components/docs/TryIt";

const methodColor: Record<string, string> = {
  GET: "text-leaf-300 bg-leaf-900/40",
  POST: "text-amber-300 bg-amber-900/40",
  DELETE: "text-red-300 bg-red-900/40",
  PATCH: "text-blue-300 bg-blue-900/40",
};

interface Props {
  params: Promise<{ slug?: string[] }>;
}

export async function generateStaticParams() {
  return [
    { slug: [] },
    ...endpoints.map((e) => ({ slug: [e.id] })),
  ];
}

export default async function DocsPage({ params }: Props) {
  const { slug } = await params;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

  // Index page
  if (!slug || slug.length === 0) {
    return (
      <div className="min-h-screen">
        <DocsHeader />
        <main className="mx-auto max-w-4xl px-6 py-12">
          <h1 className="text-3xl font-bold">API Reference</h1>
          <p className="mt-2 text-ink-100">
            Base URL{" "}
            <code className="font-mono text-leaf-300">{apiUrl}</code>.{" "}
            In local mode (default) no auth is required. Otherwise pass{" "}
            <code className="font-mono text-leaf-300">Authorization: Bearer nl_…</code>.
          </p>

          <div className="mt-10 space-y-2">
            {endpoints.map((ep) => (
              <Link
                key={ep.id}
                href={`/docs/${ep.id}`}
                className="group flex items-center gap-4 rounded-xl border border-white/10 bg-ink-900/40 p-4 transition-colors hover:border-leaf-500/40 hover:bg-ink-900/70"
              >
                <span
                  className={`shrink-0 rounded px-2 py-0.5 font-mono text-xs font-semibold ${methodColor[ep.method]}`}
                >
                  {ep.method}
                </span>
                <span className="flex-1 font-mono text-sm text-white">{ep.path}</span>
                <span className="flex-1 text-sm text-ink-100 group-hover:text-ink-50">
                  {ep.title}
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-ink-300 group-hover:text-leaf-400" />
              </Link>
            ))}
          </div>
        </main>
      </div>
    );
  }

  const ep = getEndpoint(slug[0]);
  if (!ep) notFound();

  const idx = endpoints.findIndex((e) => e.id === ep.id);
  const prev = endpoints[idx - 1];
  const next = endpoints[idx + 1];

  return (
    <div className="min-h-screen">
      <DocsHeader />
      <div className="mx-auto flex max-w-4xl gap-8 px-6 py-12">
        {/* Sidebar */}
        <nav className="hidden w-52 shrink-0 lg:block">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-300">
            Endpoints
          </p>
          <ul className="space-y-1">
            {endpoints.map((e) => (
              <li key={e.id}>
                <Link
                  href={`/docs/${e.id}`}
                  className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                    e.id === ep.id
                      ? "bg-leaf-900/40 text-leaf-300"
                      : "text-ink-100 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span
                    className={`shrink-0 rounded px-1 py-0.5 font-mono text-[10px] font-semibold ${methodColor[e.method]}`}
                  >
                    {e.method}
                  </span>
                  <span className="truncate">{e.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Main content */}
        <article className="min-w-0 flex-1">
          {/* Breadcrumb */}
          <div className="mb-4 flex items-center gap-1.5 text-sm text-ink-300">
            <Link href="/docs" className="hover:text-white">
              API Reference
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-white">{ep.title}</span>
          </div>

          {/* Title */}
          <div className="flex items-center gap-3">
            <span
              className={`rounded px-2.5 py-1 font-mono text-sm font-semibold ${methodColor[ep.method]}`}
            >
              {ep.method}
            </span>
            <code className="font-mono text-lg text-white">{ep.path}</code>
          </div>
          <h1 className="mt-2 text-2xl font-bold">{ep.title}</h1>
          <p className="mt-3 text-ink-100 leading-relaxed">{ep.description}</p>

          {/* Parameters */}
          {ep.bodyParams && ep.bodyParams.length > 0 && (
            <section className="mt-8">
              <h2 className="mb-3 text-lg font-semibold">Request body</h2>
              <div className="overflow-hidden rounded-xl border border-white/10">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 bg-ink-900/60">
                      <th className="px-4 py-2.5 text-left font-semibold text-ink-50">Name</th>
                      <th className="px-4 py-2.5 text-left font-semibold text-ink-50">Type</th>
                      <th className="px-4 py-2.5 text-left font-semibold text-ink-50">
                        Required
                      </th>
                      <th className="px-4 py-2.5 text-left font-semibold text-ink-50">
                        Description
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {ep.bodyParams.map((p) => (
                      <tr
                        key={p.name}
                        className="border-b border-white/5 last:border-0 hover:bg-white/3"
                      >
                        <td className="px-4 py-2.5 font-mono text-leaf-300">{p.name}</td>
                        <td className="px-4 py-2.5 font-mono text-xs text-amber-300">
                          {p.type}
                        </td>
                        <td className="px-4 py-2.5 text-xs">
                          {p.required ? (
                            <span className="text-leaf-400">required</span>
                          ) : (
                            <span className="text-ink-300">optional</span>
                          )}
                          {p.default && (
                            <span className="ml-1 text-ink-400">
                              (default: {p.default})
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-ink-100">{p.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {ep.queryParams && ep.queryParams.length > 0 && (
            <section className="mt-8">
              <h2 className="mb-3 text-lg font-semibold">Query / path parameters</h2>
              <div className="overflow-hidden rounded-xl border border-white/10">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 bg-ink-900/60">
                      <th className="px-4 py-2.5 text-left font-semibold text-ink-50">Name</th>
                      <th className="px-4 py-2.5 text-left font-semibold text-ink-50">Type</th>
                      <th className="px-4 py-2.5 text-left font-semibold text-ink-50">
                        Required
                      </th>
                      <th className="px-4 py-2.5 text-left font-semibold text-ink-50">
                        Description
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {ep.queryParams.map((p) => (
                      <tr
                        key={p.name}
                        className="border-b border-white/5 last:border-0"
                      >
                        <td className="px-4 py-2.5 font-mono text-leaf-300">{p.name}</td>
                        <td className="px-4 py-2.5 font-mono text-xs text-amber-300">
                          {p.type}
                        </td>
                        <td className="px-4 py-2.5 text-xs">
                          {p.required ? (
                            <span className="text-leaf-400">required</span>
                          ) : (
                            <span className="text-ink-300">optional</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-ink-100">{p.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Curl example */}
          <section className="mt-8">
            <h2 className="mb-3 text-lg font-semibold">Example</h2>
            <pre className="overflow-x-auto rounded-xl bg-ink-950 p-4 font-mono text-xs text-leaf-100">
              <code>{ep.curl}</code>
            </pre>
          </section>

          {/* Example response */}
          <section className="mt-6">
            <h2 className="mb-3 text-lg font-semibold">Response</h2>
            <pre className="overflow-x-auto rounded-xl bg-ink-950 p-4 font-mono text-xs text-ink-50">
              <code>{ep.exampleResponse}</code>
            </pre>
          </section>

          {/* Try it form */}
          <TryIt endpoint={ep} apiUrl={apiUrl} />

          {/* Prev / Next */}
          <div className="mt-10 flex items-center justify-between border-t border-white/10 pt-6">
            {prev ? (
              <Link
                href={`/docs/${prev.id}`}
                className="flex items-center gap-1 text-sm text-ink-100 hover:text-white"
              >
                ← {prev.title}
              </Link>
            ) : (
              <div />
            )}
            {next ? (
              <Link
                href={`/docs/${next.id}`}
                className="flex items-center gap-1 text-sm text-ink-100 hover:text-white"
              >
                {next.title} →
              </Link>
            ) : (
              <div />
            )}
          </div>
        </article>
      </div>
    </div>
  );
}

function DocsHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-white/5 bg-ink-950/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-6">
        <div className="flex items-center gap-1.5 text-sm">
          <Link href="/" className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
            <Leaf className="h-4 w-4 text-leaf-400" />
            <span className="font-semibold">Netleaf</span>
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-ink-300/50" />
          <Link href="/docs" className="text-ink-100 hover:text-white transition-colors">
            Docs
          </Link>
        </div>
        <Link href="/dashboard" className="text-sm text-ink-100 hover:text-white transition-colors">
          Dashboard →
        </Link>
      </div>
    </header>
  );
}
