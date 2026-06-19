import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ChevronRight } from "lucide-react";
import { endpoints, getEndpoint, type EndpointDoc, type ParamDef } from "@/lib/endpoints";
import { TryIt } from "@/components/docs/TryIt";

interface Props {
  params: Promise<{ slug?: string[] }>;
}

const METHOD_COLOR: Record<string, string> = {
  GET:    "text-sky-300 bg-sky-900/40",
  POST:   "text-amber-300 bg-amber-900/40",
  DELETE: "text-red-300 bg-red-900/40",
  PATCH:  "text-violet-300 bg-violet-900/40",
};

export async function generateStaticParams() {
  return [
    { slug: [] },
    { slug: ["quickstart"] },
    { slug: ["authentication"] },
    { slug: ["guides", "crawl-docs"] },
    { slug: ["guides", "local-extraction"] },
    { slug: ["guides", "scheduling"] },
    ...endpoints.map((e) => ({ slug: [e.id] })),
  ];
}

// ── Shared primitives ─────────────────────────────────────────────────────────

function Breadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <div className="mb-7 flex items-center gap-1.5 text-sm text-ink-500">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-ink-600" />}
          {item.href ? (
            <Link href={item.href} className="transition-colors hover:text-ink-300">
              {item.label}
            </Link>
          ) : (
            <span className="text-ink-300">{item.label}</span>
          )}
        </span>
      ))}
    </div>
  );
}

function InlineCode({ children }: { children: string }) {
  return (
    <code className="rounded-md bg-white/[0.08] px-1.5 py-0.5 font-mono text-[0.84em] text-leaf-300">
      {children}
    </code>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <div className="my-5 overflow-hidden rounded-xl border border-white/[0.08] bg-ink-900/70">
      <div className="border-b border-white/[0.06] bg-ink-950/50 px-4 py-2">
        <span className="font-mono text-[11px] text-ink-500">bash</span>
      </div>
      <div className="overflow-x-auto px-5 py-4">
        <pre className="font-mono text-[13px] leading-relaxed text-ink-100">{children}</pre>
      </div>
    </div>
  );
}

function Callout({
  type = "info",
  children,
}: {
  type?: "info" | "warning" | "tip";
  children: React.ReactNode;
}) {
  const styles = {
    info:    "border-leaf-500/25 bg-leaf-950/40",
    warning: "border-amber-500/25 bg-amber-950/30",
    tip:     "border-sky-500/25 bg-sky-950/30",
  };
  const labels  = { info: "Note", warning: "Warning", tip: "Tip" };
  const lblClrs = { info: "text-leaf-300", warning: "text-amber-300", tip: "text-sky-300" };

  return (
    <div className={`my-5 rounded-xl border px-4 py-3.5 ${styles[type]}`}>
      <p className="text-sm leading-relaxed">
        <strong className={`font-semibold ${lblClrs[type]}`}>{labels[type]}: </strong>
        <span className="text-ink-200">{children}</span>
      </p>
    </div>
  );
}

function ParamTable({ params, title, id }: { params: ParamDef[]; title: string; id: string }) {
  return (
    <section id={id} className="mt-9 scroll-mt-24">
      <h2 className="mb-3 text-xl font-semibold text-white">{title}</h2>
      <div className="overflow-hidden rounded-xl border border-white/[0.08]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.07] bg-ink-900/70">
              <th className="px-4 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-wider text-ink-500">Name</th>
              <th className="px-4 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-wider text-ink-500">Type</th>
              <th className="px-4 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-wider text-ink-500">Required</th>
              <th className="px-4 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-wider text-ink-500">Description</th>
            </tr>
          </thead>
          <tbody>
            {params.map((p) => (
              <tr key={p.name} className="border-b border-white/[0.05] last:border-0 transition-colors hover:bg-white/[0.02]">
                <td className="px-4 py-3 font-mono text-[13px] text-leaf-300">{p.name}</td>
                <td className="px-4 py-3 font-mono text-[12px] text-amber-300/90">{p.type}</td>
                <td className="px-4 py-3 text-xs">
                  {p.required ? (
                    <span className="rounded-full bg-leaf-900/60 px-2 py-0.5 text-leaf-400">required</span>
                  ) : (
                    <span className="text-ink-500">optional</span>
                  )}
                  {p.default && (
                    <span className="ml-2 font-mono text-[11px] text-ink-500">
                      default: {p.default}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 leading-relaxed text-ink-300">{p.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

type TocItem = { id: string; label: string };

function PageWrapper({
  children,
  toc,
  prevNext,
}: {
  children: React.ReactNode;
  toc: TocItem[];
  prevNext?: { prev?: { title: string; href: string }; next?: { title: string; href: string } };
}) {
  return (
    <div className="flex">
      {/* Content */}
      <div className="min-w-0 flex-1 px-8 py-11 xl:px-12">
        <div className="max-w-3xl">
          {children}

          {/* Prev / Next */}
          <div className="mt-14 flex items-center justify-between border-t border-white/[0.07] pt-8">
            {prevNext?.prev ? (
              <Link
                href={prevNext.prev.href}
                className="group flex items-center gap-1.5 text-sm text-ink-400 transition-colors hover:text-white"
              >
                <ChevronRight className="h-4 w-4 rotate-180 transition-transform group-hover:-translate-x-0.5" />
                {prevNext.prev.title}
              </Link>
            ) : <span />}
            {prevNext?.next ? (
              <Link
                href={prevNext.next.href}
                className="group flex items-center gap-1.5 text-sm text-ink-400 transition-colors hover:text-white"
              >
                {prevNext.next.title}
                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            ) : <span />}
          </div>
        </div>
      </div>

      {/* Right TOC */}
      {toc.length > 0 && (
        <aside className="hidden w-52 shrink-0 py-11 pr-8 xl:block">
          <div className="sticky top-24">
            <p className="mb-3 text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-500">
              On this page
            </p>
            <ul className="space-y-2 border-l border-white/[0.07]">
              {toc.map((item) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    className="block pl-4 text-[13px] leading-relaxed text-ink-400 transition-colors hover:text-white"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      )}
    </div>
  );
}

// ── Introduction ──────────────────────────────────────────────────────────────

function IntroductionPage() {
  return (
    <PageWrapper
      toc={[
        { id: "what-is-netleaf", label: "What is Netleaf?" },
        { id: "why-self-host",   label: "Why self-host?" },
        { id: "endpoints",       label: "Endpoints" },
        { id: "next-steps",      label: "Next steps" },
      ]}
      prevNext={{ next: { title: "Quick Start", href: "/docs/quickstart" } }}
    >
      <Breadcrumb items={[{ label: "Docs", href: "/docs" }, { label: "Introduction" }]} />

      <h1 className="text-[2.5rem] font-bold tracking-tight text-white">Introduction</h1>
      <p className="mt-4 text-lg leading-relaxed text-ink-300">
        Netleaf is a free, open-source web data platform. One command gets you a fully functional
        scraping and extraction API — running on your hardware, with no rate limits and no cloud bill.
      </p>

      <h2 id="what-is-netleaf" className="mt-10 mb-4 scroll-mt-24 border-t border-white/[0.06] pt-8 text-xl font-semibold text-white">
        What is Netleaf?
      </h2>
      <p className="text-ink-300 leading-relaxed">
        Netleaf exposes ten REST endpoints that cover the full web data pipeline: scraping individual
        pages, recursive crawling, URL discovery, structured AI extraction, web search, cron
        scheduling, change detection, and multi-format export. Everything runs in a single Docker
        Compose stack.
      </p>
      <p className="mt-4 text-ink-300 leading-relaxed">
        Think of it as a self-hosted alternative to Firecrawl or Apify — with multi-LLM support
        (Claude, GPT-4o-mini, and fully offline Ollama), built-in scheduling, and cryptographic
        change detection.
      </p>

      <h2 id="why-self-host" className="mt-10 mb-4 scroll-mt-24 border-t border-white/[0.06] pt-8 text-xl font-semibold text-white">
        Why self-host?
      </h2>
      <ul className="space-y-4">
        {[
          ["No rate limits",        "You control the hardware. Crawl 10 pages or 100,000."],
          ["Zero cost",             "No subscription, no credit card, no usage fees. Ever."],
          ["Data stays local",      "Pages never leave your server unless you explicitly export them."],
          ["Offline LLM extraction","Ollama lets you extract structured data with zero API calls."],
          ["MIT licensed",          "Read the source, fork it, or extend it — no restrictions."],
        ].map(([title, desc]) => (
          <li key={title} className="flex items-start gap-3.5 text-sm">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-leaf-400" />
            <span className="leading-relaxed text-ink-300">
              <strong className="font-semibold text-white">{title} — </strong>
              {desc}
            </span>
          </li>
        ))}
      </ul>

      <h2 id="endpoints" className="mt-10 mb-4 scroll-mt-24 border-t border-white/[0.06] pt-8 text-xl font-semibold text-white">
        Endpoints
      </h2>
      <p className="mb-4 text-ink-300">
        All endpoints live under base URL{" "}
        <InlineCode>http://localhost:3000</InlineCode> (or your server address).
      </p>
      <div className="overflow-hidden rounded-xl border border-white/[0.08]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.07] bg-ink-900/70">
              <th className="px-4 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-wider text-ink-500">Method</th>
              <th className="px-4 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-wider text-ink-500">Path</th>
              <th className="px-4 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-wider text-ink-500">Description</th>
            </tr>
          </thead>
          <tbody>
            {endpoints.map((ep) => (
              <tr key={ep.id} className="border-b border-white/[0.05] last:border-0 transition-colors hover:bg-white/[0.02]">
                <td className="px-4 py-2.5">
                  <span className={`rounded px-1.5 py-0.5 font-mono text-xs font-bold ${METHOD_COLOR[ep.method]}`}>
                    {ep.method}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <Link href={`/docs/${ep.id}`} className="font-mono text-[13px] text-leaf-300 transition-colors hover:text-leaf-200 hover:underline">
                    {ep.path}
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-ink-400">{ep.title}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 id="next-steps" className="mt-10 mb-5 scroll-mt-24 border-t border-white/[0.06] pt-8 text-xl font-semibold text-white">
        Next steps
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          { title: "Quick Start",           desc: "Clone, run, and make your first request in under two minutes.", href: "/docs/quickstart" },
          { title: "Authentication",        desc: "Default is local mode — no auth required. Learn when to add keys.", href: "/docs/authentication" },
          { title: "Scrape a page",         desc: "Turn any URL into clean Markdown, HTML, or plain text.",          href: "/docs/scrape" },
          { title: "Structured extraction", desc: "Extract typed JSON from any page using Claude, GPT, or Ollama.",  href: "/docs/extract" },
        ].map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group flex items-start justify-between gap-4 rounded-xl border border-white/[0.08] bg-ink-900/40 p-5 transition-colors hover:border-leaf-500/30 hover:bg-ink-900/70"
          >
            <div>
              <p className="font-semibold text-white">{card.title}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-400">{card.desc}</p>
            </div>
            <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-ink-600 transition-transform group-hover:translate-x-0.5 group-hover:text-leaf-400" />
          </Link>
        ))}
      </div>
    </PageWrapper>
  );
}

// ── Quick Start ───────────────────────────────────────────────────────────────

function QuickStartPage() {
  return (
    <PageWrapper
      toc={[
        { id: "prerequisites",  label: "Prerequisites" },
        { id: "clone-and-run",  label: "Clone & run" },
        { id: "first-request",  label: "First request" },
        { id: "local-mode",     label: "Local mode" },
        { id: "next-steps",     label: "Next steps" },
      ]}
      prevNext={{
        prev: { title: "Introduction",  href: "/docs" },
        next: { title: "Authentication", href: "/docs/authentication" },
      }}
    >
      <Breadcrumb items={[
        { label: "Docs",             href: "/docs" },
        { label: "Getting Started",  href: "/docs" },
        { label: "Quick Start" },
      ]} />

      <h1 className="text-[2.5rem] font-bold tracking-tight text-white">Quick Start</h1>
      <p className="mt-4 text-lg leading-relaxed text-ink-300">
        Get Netleaf running locally in under two minutes.
      </p>

      <h2 id="prerequisites" className="mt-10 mb-3 scroll-mt-24 border-t border-white/[0.06] pt-8 text-xl font-semibold text-white">
        Prerequisites
      </h2>
      <ul className="space-y-2.5 text-sm">
        {[
          ["Docker",  "Docker Desktop or Docker Engine with Compose v2+"],
          ["Git",     "Any recent version"],
          ["RAM",     "2 GB minimum — 4 GB recommended if you plan to run Ollama locally"],
        ].map(([name, note]) => (
          <li key={name} className="flex items-start gap-3 text-ink-300">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ink-500" />
            <span>
              <strong className="font-semibold text-white">{name}</strong> — {note}
            </span>
          </li>
        ))}
      </ul>

      <h2 id="clone-and-run" className="mt-10 mb-3 scroll-mt-24 border-t border-white/[0.06] pt-8 text-xl font-semibold text-white">
        Clone & run
      </h2>
      <CodeBlock>{`git clone https://github.com/Ramcode64/netleaf
cd netleaf
cp apps/api/.env.example apps/api/.env
docker compose up`}</CodeBlock>
      <p className="text-sm text-ink-400">
        Docker pulls Postgres, Redis, and the Netleaf image, applies migrations automatically, and
        starts the API on <InlineCode>http://localhost:3000</InlineCode>.
      </p>
      <Callout type="tip">
        Add <InlineCode>-d</InlineCode> to run in the background and free up your terminal.
      </Callout>

      <h2 id="first-request" className="mt-10 mb-3 scroll-mt-24 border-t border-white/[0.06] pt-8 text-xl font-semibold text-white">
        First request
      </h2>
      <CodeBlock>{`curl -X POST http://localhost:3000/v1/scrape \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://example.com", "formats": ["markdown"]}'`}</CodeBlock>
      <p className="text-sm text-ink-400">
        You should receive a JSON envelope with <InlineCode>title</InlineCode> and{" "}
        <InlineCode>markdown</InlineCode> fields.
      </p>

      <h2 id="local-mode" className="mt-10 mb-3 scroll-mt-24 border-t border-white/[0.06] pt-8 text-xl font-semibold text-white">
        Local mode
      </h2>
      <p className="text-ink-300 leading-relaxed">
        The default config ships with <InlineCode>LOCAL_MODE=false</InlineCode> (auth enabled). For
        personal use, set <InlineCode>LOCAL_MODE=true</InlineCode> in{" "}
        <InlineCode>apps/api/.env</InlineCode> and restart — no API key needed.
      </p>

      <h2 id="next-steps" className="mt-10 mb-4 scroll-mt-24 border-t border-white/[0.06] pt-8 text-xl font-semibold text-white">
        Next steps
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          { title: "Authentication →", desc: "Create API keys for production deployments.",       href: "/docs/authentication" },
          { title: "Scrape a page →",  desc: "Full reference for /v1/scrape.",                  href: "/docs/scrape" },
          { title: "Crawl a site →",   desc: "Recursively index entire websites.",               href: "/docs/crawl" },
          { title: "Guides →",         desc: "End-to-end tutorials for common workflows.",        href: "/docs/guides/crawl-docs" },
        ].map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="rounded-xl border border-white/[0.08] bg-ink-900/40 p-4 transition-colors hover:border-leaf-500/30 hover:bg-ink-900/70"
          >
            <p className="font-medium text-white">{card.title}</p>
            <p className="mt-1 text-sm text-ink-400">{card.desc}</p>
          </Link>
        ))}
      </div>
    </PageWrapper>
  );
}

// ── Authentication ────────────────────────────────────────────────────────────

function AuthenticationPage() {
  return (
    <PageWrapper
      toc={[
        { id: "local-mode",     label: "Local mode" },
        { id: "enabling-auth",  label: "Enabling auth" },
        { id: "api-keys",       label: "API keys" },
        { id: "using-keys",     label: "Using keys" },
      ]}
      prevNext={{
        prev: { title: "Quick Start",   href: "/docs/quickstart" },
        next: { title: "Scrape a page", href: "/docs/scrape" },
      }}
    >
      <Breadcrumb items={[
        { label: "Docs",            href: "/docs" },
        { label: "Getting Started", href: "/docs" },
        { label: "Authentication" },
      ]} />

      <h1 className="text-[2.5rem] font-bold tracking-tight text-white">Authentication</h1>
      <p className="mt-4 text-lg leading-relaxed text-ink-300">
        Netleaf supports two modes: unauthenticated local mode for development, and bearer token
        auth for production.
      </p>

      <h2 id="local-mode" className="mt-10 mb-3 scroll-mt-24 border-t border-white/[0.06] pt-8 text-xl font-semibold text-white">
        Local mode
      </h2>
      <p className="text-ink-300 leading-relaxed">
        When <InlineCode>LOCAL_MODE=true</InlineCode> is set in <InlineCode>apps/api/.env</InlineCode>,
        all API key checks are skipped. Every request is treated as authenticated. Ideal for personal
        use on a private network.
      </p>
      <CodeBlock>{`# apps/api/.env
LOCAL_MODE=true`}</CodeBlock>
      <Callout type="warning">
        Never expose local mode to the public internet. Use API keys for any externally accessible
        deployment.
      </Callout>

      <h2 id="enabling-auth" className="mt-10 mb-3 scroll-mt-24 border-t border-white/[0.06] pt-8 text-xl font-semibold text-white">
        Enabling auth
      </h2>
      <p className="text-ink-300 leading-relaxed">
        Set <InlineCode>LOCAL_MODE=false</InlineCode> to require a valid API key on every request.
        The web dashboard requires sign-in via email/password by default. Google OAuth is
        optional — set <InlineCode>AUTH_GOOGLE_ID</InlineCode> and{" "}
        <InlineCode>AUTH_GOOGLE_SECRET</InlineCode> to enable it.
      </p>
      <CodeBlock>{`# apps/api/.env
LOCAL_MODE=false

# Restart after changing
docker compose restart api`}</CodeBlock>

      <h2 id="api-keys" className="mt-10 mb-3 scroll-mt-24 border-t border-white/[0.06] pt-8 text-xl font-semibold text-white">
        API keys
      </h2>
      <p className="text-ink-300 leading-relaxed mb-3">
        Create keys from the dashboard at{" "}
        <Link href="/dashboard/api-keys" className="text-leaf-400 transition-colors hover:underline">
          /dashboard/api-keys
        </Link>{" "}
        or via the management endpoint:
      </p>
      <CodeBlock>{`curl -X POST http://localhost:3000/v1/keys \\
  -H "Authorization: Bearer nl_existing_key" \\
  -H "Content-Type: application/json" \\
  -d '{"name": "production"}'`}</CodeBlock>
      <Callout type="info">
        The raw key (prefixed <InlineCode>nl_</InlineCode>) is shown only once at creation. Netleaf
        stores only the SHA-256 hash — save it somewhere safe immediately.
      </Callout>

      <h2 id="using-keys" className="mt-10 mb-3 scroll-mt-24 border-t border-white/[0.06] pt-8 text-xl font-semibold text-white">
        Using keys
      </h2>
      <p className="text-ink-300 leading-relaxed mb-3">
        Pass the key as a standard HTTP Bearer token on every request:
      </p>
      <CodeBlock>{`curl -X POST http://localhost:3000/v1/scrape \\
  -H "Authorization: Bearer nl_abc123..." \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://example.com"}'`}</CodeBlock>
      <p className="text-sm text-ink-400">
        Missing or invalid keys return <InlineCode>401 Unauthorized</InlineCode>.
      </p>
    </PageWrapper>
  );
}

// ── API Endpoint page ─────────────────────────────────────────────────────────

function EndpointPage({ ep, apiUrl }: { ep: EndpointDoc; apiUrl: string }) {
  const idx  = endpoints.findIndex((e) => e.id === ep.id);
  const prev = endpoints[idx - 1];
  const next = endpoints[idx + 1];

  const toc: TocItem[] = [
    ...(ep.bodyParams?.length  ? [{ id: "request-body",     label: "Request body" }]     : []),
    ...(ep.queryParams?.length ? [{ id: "query-parameters", label: "Query parameters" }] : []),
    { id: "example",  label: "Example" },
    { id: "response", label: "Response" },
    { id: "try-it",   label: "Try it" },
  ];

  return (
    <PageWrapper
      toc={toc}
      prevNext={{
        prev: prev ? { title: prev.title, href: `/docs/${prev.id}` } : undefined,
        next: next ? { title: next.title, href: `/docs/${next.id}` } : undefined,
      }}
    >
      <Breadcrumb items={[
        { label: "Docs",          href: "/docs" },
        { label: "API Reference", href: "/docs/scrape" },
        { label: ep.title },
      ]} />

      <div className="flex items-center gap-2.5">
        <span className={`rounded-md px-2.5 py-1 font-mono text-sm font-bold ${METHOD_COLOR[ep.method]}`}>
          {ep.method}
        </span>
        <code className="font-mono text-base text-ink-300">{ep.path}</code>
      </div>

      <h1 className="mt-3 text-[2.5rem] font-bold tracking-tight text-white">{ep.title}</h1>
      <p className="mt-4 text-lg leading-relaxed text-ink-300">{ep.description}</p>

      {ep.bodyParams  && ep.bodyParams.length  > 0 && (
        <ParamTable params={ep.bodyParams}  title="Request body"     id="request-body"     />
      )}
      {ep.queryParams && ep.queryParams.length > 0 && (
        <ParamTable params={ep.queryParams} title="Query parameters" id="query-parameters" />
      )}

      <section id="example"  className="mt-9 scroll-mt-24">
        <h2 className="mb-3 text-xl font-semibold text-white">Example</h2>
        <CodeBlock>{ep.curl}</CodeBlock>
      </section>

      <section id="response" className="mt-9 scroll-mt-24">
        <h2 className="mb-3 text-xl font-semibold text-white">Response</h2>
        <CodeBlock>{ep.exampleResponse}</CodeBlock>
      </section>

      <section id="try-it"   className="mt-9 scroll-mt-24">
        <TryIt endpoint={ep} apiUrl={apiUrl} />
      </section>
    </PageWrapper>
  );
}

// ── Guide: Crawl a docs site ──────────────────────────────────────────────────

function GuideCrawlDocs() {
  return (
    <PageWrapper
      toc={[
        { id: "overview",    label: "Overview" },
        { id: "start-crawl", label: "Start the crawl" },
        { id: "poll",        label: "Poll for completion" },
        { id: "export",      label: "Export results" },
      ]}
      prevNext={{
        prev: { title: "Export results",       href: "/docs/export" },
        next: { title: "Local LLM extraction", href: "/docs/guides/local-extraction" },
      }}
    >
      <Breadcrumb items={[
        { label: "Docs",   href: "/docs" },
        { label: "Guides", href: "/docs/guides/crawl-docs" },
        { label: "Crawl a docs site" },
      ]} />

      <h1 className="text-[2.5rem] font-bold tracking-tight text-white">Crawl a docs site</h1>
      <p className="mt-4 text-lg leading-relaxed text-ink-300">
        Index an entire documentation site and export every page as Markdown — ready for offline
        search or LLM ingestion.
      </p>

      <h2 id="overview" className="mt-10 mb-3 scroll-mt-24 border-t border-white/[0.06] pt-8 text-xl font-semibold text-white">
        Overview
      </h2>
      <p className="text-ink-300 leading-relaxed">
        Three steps: start a recursive crawl, poll until it completes, then export all pages as a
        ZIP of Markdown files.
      </p>

      <h2 id="start-crawl" className="mt-10 mb-3 scroll-mt-24 border-t border-white/[0.06] pt-8 text-xl font-semibold text-white">
        Start the crawl
      </h2>
      <CodeBlock>{`curl -X POST http://localhost:3000/v1/crawl \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://docs.example.com",
    "maxPages": 500,
    "maxDepth": 6,
    "formats": ["markdown"]
  }'`}</CodeBlock>
      <p className="text-sm text-ink-400">
        Save the <InlineCode>jobId</InlineCode> from the response.
      </p>

      <h2 id="poll" className="mt-10 mb-3 scroll-mt-24 border-t border-white/[0.06] pt-8 text-xl font-semibold text-white">
        Poll for completion
      </h2>
      <CodeBlock>{`curl http://localhost:3000/v1/crawl/YOUR_JOB_ID`}</CodeBlock>
      <p className="text-ink-300">
        The <InlineCode>status</InlineCode> field progresses{" "}
        <InlineCode>pending → running → completed</InlineCode>. The{" "}
        <InlineCode>pages</InlineCode> array grows in real time — you can read partial results
        before the crawl finishes.
      </p>
      <Callout type="tip">
        Add <InlineCode>&quot;webhookUrl&quot;</InlineCode> to the crawl request to receive a POST on
        completion instead of polling.
      </Callout>

      <h2 id="export" className="mt-10 mb-3 scroll-mt-24 border-t border-white/[0.06] pt-8 text-xl font-semibold text-white">
        Export results
      </h2>
      <CodeBlock>{`curl "http://localhost:3000/v1/crawl/YOUR_JOB_ID/export?format=zip" \\
  -o docs-site.zip`}</CodeBlock>
      <p className="text-ink-300">
        The ZIP contains one <InlineCode>.md</InlineCode> file per crawled page named by URL slug.
        Ready to load into a vector database, a local RAG pipeline, or an LLM context window.
      </p>
    </PageWrapper>
  );
}

// ── Guide: Local LLM extraction ───────────────────────────────────────────────

function GuideLocalExtraction() {
  return (
    <PageWrapper
      toc={[
        { id: "what-is-ollama", label: "What is Ollama?" },
        { id: "setup",          label: "Setup" },
        { id: "extraction",     label: "Extract data" },
      ]}
      prevNext={{
        prev: { title: "Crawl a docs site", href: "/docs/guides/crawl-docs" },
        next: { title: "Recurring crawls",  href: "/docs/guides/scheduling" },
      }}
    >
      <Breadcrumb items={[
        { label: "Docs",   href: "/docs" },
        { label: "Guides", href: "/docs/guides/crawl-docs" },
        { label: "Local LLM extraction" },
      ]} />

      <h1 className="text-[2.5rem] font-bold tracking-tight text-white">Local LLM extraction</h1>
      <p className="mt-4 text-lg leading-relaxed text-ink-300">
        Extract structured data from any webpage using a local Ollama model — no API keys, no cloud,
        zero cost.
      </p>

      <h2 id="what-is-ollama" className="mt-10 mb-3 scroll-mt-24 border-t border-white/[0.06] pt-8 text-xl font-semibold text-white">
        What is Ollama?
      </h2>
      <p className="text-ink-300 leading-relaxed">
        Ollama runs open-source LLMs (Llama 3, Mistral, Gemma, Phi-4, and more) locally on your CPU
        or GPU. Netleaf calls Ollama directly for{" "}
        <Link href="/docs/extract" className="text-leaf-400 hover:underline">
          /v1/extract
        </Link>{" "}
        when you pass <InlineCode>&quot;provider&quot;: &quot;ollama&quot;</InlineCode>.
      </p>

      <h2 id="setup" className="mt-10 mb-3 scroll-mt-24 border-t border-white/[0.06] pt-8 text-xl font-semibold text-white">
        Setup
      </h2>
      <p className="mb-2 text-ink-300">Install from ollama.com, then pull a model:</p>
      <CodeBlock>{`ollama serve
ollama pull llama3`}</CodeBlock>
      <p className="mb-2 text-ink-300">Set the Ollama URL in your Netleaf env:</p>
      <CodeBlock>{`# apps/api/.env
OLLAMA_URL=http://host.docker.internal:11434`}</CodeBlock>
      <Callout type="warning">
        When Netleaf runs inside Docker and Ollama runs on the host, use{" "}
        <InlineCode>host.docker.internal</InlineCode> — not <InlineCode>localhost</InlineCode>.
      </Callout>

      <h2 id="extraction" className="mt-10 mb-3 scroll-mt-24 border-t border-white/[0.06] pt-8 text-xl font-semibold text-white">
        Extract data
      </h2>
      <CodeBlock>{`curl -X POST http://localhost:3000/v1/extract \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://shop.example.com/product",
    "provider": "ollama",
    "schema": {
      "type": "object",
      "properties": {
        "name":    { "type": "string"  },
        "price":   { "type": "number"  },
        "inStock": { "type": "boolean" }
      },
      "required": ["name", "price"]
    }
  }'`}</CodeBlock>
      <p className="text-ink-300 leading-relaxed">
        Netleaf scrapes the page, sends the Markdown content and your schema to Ollama, validates the
        JSON output with AJV, and returns it in the standard response envelope.
      </p>
    </PageWrapper>
  );
}

// ── Guide: Recurring crawls ───────────────────────────────────────────────────

function GuideScheduling() {
  return (
    <PageWrapper
      toc={[
        { id: "cron-syntax",     label: "Cron syntax" },
        { id: "create-schedule", label: "Create a schedule" },
        { id: "manage",          label: "Manage schedules" },
        { id: "webhooks",        label: "Combine with webhooks" },
      ]}
      prevNext={{ prev: { title: "Local LLM extraction", href: "/docs/guides/local-extraction" } }}
    >
      <Breadcrumb items={[
        { label: "Docs",   href: "/docs" },
        { label: "Guides", href: "/docs/guides/crawl-docs" },
        { label: "Recurring crawls" },
      ]} />

      <h1 className="text-[2.5rem] font-bold tracking-tight text-white">Recurring crawls</h1>
      <p className="mt-4 text-lg leading-relaxed text-ink-300">
        Schedule a crawl to run automatically on any interval using standard cron expressions.
      </p>

      <h2 id="cron-syntax" className="mt-10 mb-3 scroll-mt-24 border-t border-white/[0.06] pt-8 text-xl font-semibold text-white">
        Cron syntax
      </h2>
      <p className="mb-3 text-ink-300">Standard 5-field format: <InlineCode>minute hour day month weekday</InlineCode>.</p>
      <div className="overflow-hidden rounded-xl border border-white/[0.08]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.07] bg-ink-900/70">
              <th className="px-4 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-wider text-ink-500">Expression</th>
              <th className="px-4 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-wider text-ink-500">Meaning</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["0 2 * * *",    "Every day at 02:00"],
              ["0 */6 * * *",  "Every 6 hours"],
              ["0 9 * * 1",    "Every Monday at 09:00"],
              ["*/30 * * * *", "Every 30 minutes"],
            ].map(([expr, desc]) => (
              <tr key={expr} className="border-b border-white/[0.05] last:border-0">
                <td className="px-4 py-2.5 font-mono text-[13px] text-leaf-300">{expr}</td>
                <td className="px-4 py-2.5 text-ink-300">{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 id="create-schedule" className="mt-10 mb-3 scroll-mt-24 border-t border-white/[0.06] pt-8 text-xl font-semibold text-white">
        Create a schedule
      </h2>
      <CodeBlock>{`curl -X POST http://localhost:3000/v1/schedule \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Nightly docs crawl",
    "cronExpression": "0 2 * * *",
    "url": "https://docs.example.com",
    "options": { "maxPages": 200, "formats": ["markdown"] }
  }'`}</CodeBlock>
      <p className="text-sm text-ink-400">
        The in-process scheduler polls every 60 s and enqueues a crawl job whenever{" "}
        <InlineCode>nextRunAt</InlineCode> has passed.
      </p>

      <h2 id="manage" className="mt-10 mb-3 scroll-mt-24 border-t border-white/[0.06] pt-8 text-xl font-semibold text-white">
        Manage schedules
      </h2>
      <CodeBlock>{`# List all
curl http://localhost:3000/v1/schedule

# Delete
curl -X DELETE http://localhost:3000/v1/schedule/YOUR_SCHEDULE_ID`}</CodeBlock>

      <h2 id="webhooks" className="mt-10 mb-3 scroll-mt-24 border-t border-white/[0.06] pt-8 text-xl font-semibold text-white">
        Combine with webhooks
      </h2>
      <p className="mb-2 text-ink-300">
        Add <InlineCode>webhookUrl</InlineCode> inside <InlineCode>options</InlineCode> to receive a
        POST each time a scheduled crawl completes:
      </p>
      <CodeBlock>{`{
  "name":           "Nightly with webhook",
  "cronExpression": "0 2 * * *",
  "url":            "https://docs.example.com",
  "options": {
    "maxPages":   200,
    "webhookUrl": "https://your-app.com/hooks/netleaf"
  }
}`}</CodeBlock>
      <p className="text-sm text-ink-400">
        Payloads are signed with <InlineCode>X-Netleaf-Signature</InlineCode> (HMAC-SHA256)
        when <InlineCode>WEBHOOK_SECRET</InlineCode> is set.
      </p>
    </PageWrapper>
  );
}

// ── Router ────────────────────────────────────────────────────────────────────

export default async function DocsPage({ params }: Props) {
  const { slug }  = await params;
  const slugStr   = slug ? slug.join("/") : "";
  const apiUrl    = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

  if (slugStr === "")                        return <IntroductionPage />;
  if (slugStr === "quickstart")              return <QuickStartPage />;
  if (slugStr === "authentication")          return <AuthenticationPage />;
  if (slugStr === "guides/crawl-docs")       return <GuideCrawlDocs />;
  if (slugStr === "guides/local-extraction") return <GuideLocalExtraction />;
  if (slugStr === "guides/scheduling")       return <GuideScheduling />;

  const ep = getEndpoint(slugStr);
  if (!ep) notFound();

  return <EndpointPage ep={ep} apiUrl={apiUrl} />;
}
