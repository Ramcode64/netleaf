<div align="center">

<img src="apps/web/src/app/icon.svg" width="64" height="64" alt="Netleaf logo" />

# Netleaf

**The free, open-source web data platform.**

Turn any website into clean, structured data — markdown, JSON, CSV, or AI-ready output.
Self-host in one command. No rate limits. No credit cards. No cloud lock-in.

[![MIT License](https://img.shields.io/badge/license-MIT-22c55e?style=flat-square)](https://github.com/Ramcode64/netleaf/blob/main/LICENSE)
[![Tests](https://img.shields.io/badge/tests-105%20passing-22c55e?style=flat-square)](#running-tests)
[![Docker](https://img.shields.io/badge/docker-one%20command-3b82f6?style=flat-square)](#quickstart)
[![Multi-LLM](https://img.shields.io/badge/LLM-Claude%20%7C%20OpenAI%20%7C%20Ollama-a855f7?style=flat-square)](#-llm-powered-extraction)
[![Live Demo](https://img.shields.io/badge/live%20demo-netleaf.vercel.app-0ea5e9?style=flat-square)](https://netleaf.vercel.app)

[**Live Demo**](https://netleaf.vercel.app) · [**Docs**](https://netleaf.vercel.app/docs) · [**Quickstart**](#quickstart)

</div>

---

## What is Netleaf?

Imagine you want the data from a website — maybe a product's price, a competitor's blog posts, or an entire documentation site — but it's locked in HTML, JavaScript, and CSS that's hard to work with programmatically. Netleaf solves this.

You give Netleaf a URL. It opens the page in a real browser (handling JavaScript-heavy sites that simple scrapers miss), extracts the content, and hands it back to you as clean **Markdown text**, structured **JSON**, a **CSV file**, or whatever format you need.

**No coding required for basic use.** Just run one Docker command and hit the API.

```
Website URL  →  Netleaf  →  Clean data (Markdown / JSON / CSV / ZIP)
```

**Built for developers and researchers who:**
- Are tired of Firecrawl's free tier running out mid-project
- Want to extract structured data using their own AI keys — or zero AI cost via Ollama
- Need to crawl entire websites automatically, not just individual pages
- Want to know exactly what changed on a site between two crawls (change detection)
- Prefer owning their data — nothing leaves your machine

---

## Quickstart

> **Prerequisites:** [Docker Desktop](https://docs.docker.com/get-docker/) installed. That's it.
>
> *Docker* is a tool that packages software into isolated containers so you can run complex apps (databases, servers, queues) with a single command — no manual installation of each component.

```bash
git clone https://github.com/Ramcode64/netleaf
cd netleaf
cp .env.example .env
docker compose up
```

That's it. In about 30 seconds:

| Service | URL | What it is |
|---|---|---|
| **API** | `http://localhost:3000` | The REST API — send requests here |
| **Dashboard** | `http://localhost:3001` | Web UI — manage keys, view crawl history |

No signup needed. The default mode (`LOCAL_MODE=true`) skips all authentication — just start making requests immediately.

```bash
# Try it right now — scrape any page to Markdown
curl -X POST http://localhost:3000/v1/scrape \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "formats": ["markdown"]}'
```

---

## Features at a Glance

| Feature | What it does |
|---|---|
| 🌿 **Scrape** | Fetch any single page → Markdown, HTML, or plain text |
| 🕸️ **Crawl** | Follow all links on a site automatically, up to N pages |
| 🗺️ **Map** | Discover every URL on a site in seconds (reads sitemap/robots.txt) |
| 🤖 **Extract** | Use an AI model to pull structured data fields from any page |
| 🔍 **Search** | Run a web search and optionally scrape the top results |
| ⏰ **Schedule** | Run any crawl on a repeating cron timer (daily, hourly, etc.) |
| 🔄 **Diff** | Compare two crawl runs — see exactly what pages were added, removed, or changed |
| 📦 **Export** | Download crawl results as JSON, CSV, XML, or a ZIP of Markdown files |

---

## Why Netleaf Instead of Firecrawl, Apify, or Diffbot?

### vs Firecrawl

Firecrawl is the closest spiritual predecessor. Netleaf is what Firecrawl should be for people who self-host.

| | Firecrawl | Netleaf |
|---|---|---|
| **Self-hosted** | Yes, but complex setup (S3, multiple configs) | Yes — single `docker compose up` |
| **Free tier** | 500 credits/month on their cloud | Unlimited on your own hardware |
| **AI extraction** | Locked to their internal stack | Your choice: Claude, OpenAI, or Ollama |
| **100% offline** | No | Yes — run Ollama locally, zero API calls ever |
| **Scheduled crawls** | No | Yes — cron-based, managed via UI |
| **Change detection** | No | Yes — diff any two crawl snapshots |
| **Export formats** | JSON only | JSON, CSV, XML, Markdown ZIP |
| **No-auth local mode** | No — always requires auth | Yes — `LOCAL_MODE=true`, no key needed |
| **License** | AGPL (cloud is proprietary) | MIT |
| **Price at scale** | $16–$333/month | $0 forever on self-host |

### vs Apify

Apify is a cloud-only scraping marketplace — powerful, but you're renting compute on their servers and running scripts written by third parties.

| | Apify | Netleaf |
|---|---|---|
| **Self-hostable** | No | Yes |
| **Your data stays on your machine** | No — stored on Apify cloud | Yes |
| **Free tier** | $5 platform credit/month | Unlimited on your hardware |
| **Structured AI extraction** | Cobble it together yourself | Built-in, multi-provider |
| **Change detection** | No | Yes |
| **Cost at scale** | $49–$499/month | $0 |

### vs Diffbot

Diffbot is an enterprise AI web extraction product — impressive technology, priced for enterprise budgets.

| | Diffbot | Netleaf |
|---|---|---|
| **Pricing** | $299–$999/month | $0 |
| **Self-hostable** | No | Yes |
| **Custom extraction schemas** | Yes | Yes (via JSON Schema + AI) |
| **Open source** | No | MIT |

---

## API Reference

> **What is a REST API?** It's a way to talk to a server using simple HTTP requests — the same protocol your browser uses. You send a request to a URL with some data, and get a response back. Tools like `curl` (shown below), Postman, or any programming language can make these requests.

All endpoints return `{ "success": true, "data": ... }`.

**Authentication:** In local mode (default), no auth header needed. In multi-user mode: add `Authorization: Bearer nl_your_api_key` to every request.

---

### 🌿 `POST /v1/scrape` — Convert any page to Markdown

Opens the URL in a real headless browser (Chromium via Playwright), waits for JavaScript to load, then extracts the content.

> **What is a headless browser?** A browser with no visible window. It loads pages exactly like Chrome or Firefox would — running JavaScript, rendering CSS, handling redirects — but in the background. This is how Netleaf handles modern JS-heavy sites that simple `fetch()` calls miss.

```bash
curl -X POST http://localhost:3000/v1/scrape \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://news.ycombinator.com",
    "formats": ["markdown", "html", "links"],
    "waitForSelector": "main"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "url": "https://news.ycombinator.com",
    "markdown": "# Hacker News\n\n1. Some article title...",
    "html": "<html>...",
    "metadata": { "title": "Hacker News", "statusCode": 200 }
  }
}
```

| Option | Type | Description |
|---|---|---|
| `formats` | `string[]` | `"markdown"`, `"html"`, `"text"`, or `"links"` (same-host links) |
| `waitForSelector` | `string` | CSS selector to wait for before extracting (e.g. `"main"`). If not found within 5s, a non-fatal `warnings` entry is returned and partial content is still delivered. |
| `timeout` | `number` | Navigation timeout in ms (1000–60000, default 30000) |

Markdown link/image hrefs are absolutized against the page URL, so the output is portable. A `warnings` array is included only when something non-fatal happened (e.g. a missing `waitForSelector`).

---

### 🕸️ `POST /v1/crawl` — Crawl an entire website

Starts an automatic crawl from a starting URL. Netleaf follows every internal link it finds, up to your `maxPages` limit. Runs asynchronously in the background — you get a `jobId` immediately and poll for results.

> **What is async / background job?** Instead of making you wait while it crawls 1000 pages (which could take minutes), Netleaf starts the job and gives you an ID immediately. You check back whenever you want to see progress or grab results.

> **What is BFS (Breadth-First Search)?** The crawl strategy. It processes pages level by level — first the homepage, then all pages linked from the homepage, then all pages linked from those, and so on. This ensures you get the most important pages first.

```bash
# 1. Start the crawl
curl -X POST http://localhost:3000/v1/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://docs.example.com",
    "maxPages": 100,
    "formats": ["markdown"],
    "webhookUrl": "https://your-app.com/webhook"
  }'
# → { "success": true, "data": { "jobId": "abc-123" } }

# 2. Check progress — use the lightweight /status endpoint while polling
curl http://localhost:3000/v1/crawl/abc-123/status
# → { "status": "running", "totalScraped": 34, "totalFound": 89, "webhookSent": false }

# 3. Fetch full results (paginated: ?offset=&limit=, max 500/page)
curl http://localhost:3000/v1/crawl/abc-123

# 4. Export when done
curl "http://localhost:3000/v1/crawl/abc-123/export?format=csv" -o results.csv
```

- **`GET /v1/crawl/:id/status`** — lightweight polling (no page join); includes `webhookSent` delivery status when a webhook is attached.
- **`GET /v1/crawl/:id`** — full results, paginated via `?offset=&limit=`.
- **`POST /v1/crawl/:id/webhook`** — attach a webhook to a running job (409 if already finished).
- **Export formats:** `json` · `csv` · `xml` · `zip` (one `.md` file per page).
- SSRF-blocked start URLs are rejected immediately with `422` (not accepted then failed).

---

### 🗺️ `POST /v1/map` — Discover all URLs on a site

Fast URL discovery **without** launching a browser. Checks `robots.txt` → sitemap → homepage links. Returns up to 1000 URLs in under 2 seconds.

> **What is robots.txt?** A file websites publish at `/robots.txt` listing their sitemap locations and crawling rules. **What is a sitemap?** An XML file listing every URL on a site — search engines like Google use it to discover pages. Netleaf reads both to find URLs instantly without having to crawl the entire site.

```bash
curl -X POST http://localhost:3000/v1/map \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "limit": 500}'
```

```json
{
  "success": true,
  "data": {
    "source": "sitemap",
    "links": ["https://example.com/about", "https://example.com/blog/..."],
    "total": 147
  }
}
```

| Option | Type | Description |
|---|---|---|
| `limit` | `number` | Max URLs to return (default 100, max 1000) |
| `includeSubdomains` | `boolean` | Include links to subdomains of the target host |
| `includeExternal` | `boolean` | Include off-domain links (capped at 50) |

When a site has no sitemap and the homepage exposes no same-host links, the response includes a `note` explaining the empty result (rather than looking broken).

---

### 🤖 `POST /v1/extract` — AI-powered structured data extraction

Scrapes a page, then asks an AI model to extract exactly the fields you define — according to a schema you provide. Works with Claude, OpenAI, or completely offline with Ollama.

> **What is a JSON Schema?** A description of the shape of data you want back. You define which fields to extract and their types (`string`, `number`, `boolean`). The AI reads the page and fills in those fields.

> **What is Ollama?** A tool that lets you run AI language models (like Llama, Mistral) entirely on your own machine with no internet connection and zero cost. No API keys, no monthly bills.

```bash
curl -X POST http://localhost:3000/v1/extract \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://shop.example.com/product/123",
    "schema": {
      "type": "object",
      "properties": {
        "name":    { "type": "string" },
        "price":   { "type": "number" },
        "inStock": { "type": "boolean" }
      },
      "required": ["name", "price"]
    },
    "provider": "ollama"
  }'
```

```json
{
  "success": true,
  "data": { "name": "Wireless Headphones", "price": 79.99, "inStock": true }
}
```

| Provider | Setup | Cost |
|---|---|---|
| `claude` | Set `ANTHROPIC_API_KEY` | ~$0.001 per page |
| `openai` | Set `OPENAI_API_KEY` | ~$0.001 per page |
| `ollama` | Install Ollama, pull a model | **$0 forever, fully offline** |

---

### 🔍 `POST /v1/search` — Web search + scrape

Search the web via Brave Search, then optionally scrape the full content of each result.

> **Why Brave Search?** It has a free API tier (2000 requests/month) and returns unbiased results independent of Google. Get your free key at [search.brave.com](https://search.brave.com/search/api).

```bash
curl -X POST http://localhost:3000/v1/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "best open source web scraping tools 2025",
    "maxResults": 5,
    "scrape": true
  }'
```

Returns title, description, URL, and optionally the full Markdown of each result page. Requires `BRAVE_API_KEY`.

---

### ⏰ `POST /v1/schedule` — Recurring crawls on a timer

Create a crawl job that runs automatically on any schedule — daily, hourly, every Monday at 9am, whatever you need.

> **What is a cron expression?** A compact way to write a schedule. `"0 8 * * *"` means "at 8:00 AM every day". `"0 */6 * * *"` means "every 6 hours". You can use [crontab.guru](https://crontab.guru) to build these visually.

```bash
# Create a schedule: crawl a competitor site daily at 8am
curl -X POST http://localhost:3000/v1/schedule \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Daily competitor check",
    "cronExpression": "0 8 * * *",
    "url": "https://competitor.com",
    "maxPages": 50,
    "webhookUrl": "https://your-app.com/on-crawl-complete"
  }'

# List all your schedules
curl http://localhost:3000/v1/schedule

# Pause a schedule (without deleting it)
curl -X PATCH http://localhost:3000/v1/schedule/<id> -d '{"isActive": false}'
```

---

### 🔄 `GET /v1/diff` — Detect what changed between two crawls

On every crawl, Netleaf stores a fingerprint (SHA-256 hash) of each page's content. The diff endpoint compares any two crawl runs and tells you exactly what was added, removed, or changed.

> **What is SHA-256 hashing?** A mathematical function that takes any text and produces a unique fixed-length fingerprint. If even one character changes, the fingerprint changes completely. This lets Netleaf detect content changes without storing the full page content twice.

```bash
curl "http://localhost:3000/v1/diff?jobIdA=<uuid-1>&jobIdB=<uuid-2>"
```

```json
{
  "success": true,
  "data": {
    "added":     ["https://example.com/new-page"],
    "removed":   ["https://example.com/old-page"],
    "changed":   ["https://example.com/pricing"],
    "unchanged": 94
  }
}
```

Use this to monitor competitor pricing, track documentation changes, or build alerts when content updates.

---

## 🦙 Ollama Setup — 100% Offline AI Extraction

No API key. No cloud. No cost. Extract structured data entirely on your own hardware.

```bash
# 1. Install Ollama (Mac/Linux)
curl -fsSL https://ollama.ai/install.sh | sh

# 2. Pull a model (llama3.2 is fast and small — ~2GB download)
ollama pull llama3.2

# 3. Tell Netleaf which model to use, then start it. Ollama runs on your host;
#    the Docker container reaches it via host.docker.internal.
OLLAMA_URL=http://host.docker.internal:11434 OLLAMA_MODEL=llama3.2 docker compose up
```

Then use `"provider": "ollama"` in `/v1/extract`. The entire scrape → AI extraction loop never leaves your machine.

> **Reasoning models** (qwen3, deepseek-r1, etc.) are fully supported — Netleaf sends `think: false` and falls back to the `thinking` field so structured output is captured reliably. Set `OLLAMA_MODEL` to whatever you've pulled; it defaults to `llama3.1`.

---

## Architecture

> **Tech stack explained for newcomers:**
>
> - **Fastify** — a fast Node.js web server framework (like Express, but faster)
> - **Playwright** — Microsoft's library for controlling a real Chromium browser from code
> - **BullMQ** — a job queue: when you start a crawl, jobs are added to a queue and processed in the background. Survives server restarts.
> - **Redis** — an in-memory database used by BullMQ to store the job queue
> - **Drizzle ORM** — a TypeScript library for querying PostgreSQL safely (no raw SQL strings = no SQL injection)
> - **PostgreSQL** — the main database storing users, API keys, crawl results
> - **Next.js 16** — the React framework powering the web dashboard (App Router = file-based routing)
> - **Tailwind CSS** — a utility-first CSS framework (style by adding class names)
> - **Auth.js v5** — handles login sessions, JWT tokens, OAuth (Google) for the dashboard
> - **Vitest** — a fast JavaScript test runner (105 tests across all services)

```
netleaf/
├── apps/
│   ├── api/                    # Fastify REST API (TypeScript)
│   │   └── src/
│   │       ├── scraper/        # Playwright browser pool — headless Chromium
│   │       ├── crawler/        # BFS engine + link parser (cheerio)
│   │       ├── queue/          # BullMQ + Redis async job queue
│   │       ├── db/             # Drizzle ORM + PostgreSQL (schema, migrations)
│   │       ├── security/       # SSRF egress guard, input validators
│   │       ├── services/       # map · extract · search · diff · scheduler · webhook
│   │       └── api/routes/     # scrape · crawl · map · extract · search · schedule · keys
│   │
│   └── web/                    # Next.js 16 dashboard (App Router)
│       └── src/
│           ├── app/            # landing, auth, dashboard, docs, API routes
│           ├── components/     # landing sections, dashboard widgets, docs Try-It UI
│           └── lib/            # auth (Auth.js v5), db (Drizzle), server actions
│
└── packages/
    └── shared-types/           # TypeScript types shared between API and web
```

---

## Security

Netleaf is designed to be safe to expose as a public service, not just a personal tool.

| Protection | What it prevents |
|---|---|
| **SSRF guard** | Attackers using Netleaf to scrape your internal network (e.g. `192.168.x.x`, AWS metadata at `169.254.169.254`). All redirect chains are validated hop-by-hop. |
| **Scheme allowlist** | `file://`, `javascript:`, `ftp://`, `data:` URLs are rejected before any fetch |
| **Schema size limits** | `/v1/extract` schemas capped at 50KB, depth ≤ 20, `$ref` rejected — prevents memory exhaustion |
| **Rate limiting** | Per-token rate limiting runs before auth. Distributed across instances via Upstash when configured (`UPSTASH_REDIS_REST_URL`), in-memory fallback otherwise |
| **Consistent error envelope** | Global handlers map DB/Redis failures → `503` (no internal hostnames leaked), malformed bodies → `400`, and unknown routes → a `{success:false,error}` 404. Validation errors include the field path |
| **CSV injection prevention** | Cells starting with `= + - @ \t` are prefixed with `'` — prevents formula injection when opened in Excel |
| **No account enumeration** | Registration uses constraint-violation catch (not check-then-insert) — can't probe whether an email is registered |
| **Constant-time login** | Dummy bcrypt compare on unknown emails equalizes response time (no timing oracle) |
| **105 tests** | Dedicated SSRF test suite covering 20 attack vectors |

> **DNS rebinding (H-4):** the headless-browser scrape/crawl path manages its own DNS and can't be IP-pinned in code. For untrusted multi-tenant deployments, pair Netleaf with a **network-level egress firewall** blocking outbound traffic to private/link-local/metadata ranges, then set `EGRESS_FIREWALL_DECLARED=true` to silence the startup warning. The plain-fetch paths (map/sitemap) revalidate every redirect hop.

> **What is SSRF?** Server-Side Request Forgery. An attack where a malicious user tricks your server into making HTTP requests to internal services (your database, cloud metadata APIs, internal admin panels) that should never be publicly reachable. Netleaf's egress guard blocks this.

---

## Environment Variables

### `apps/api` (the backend)

| Variable | Default | Required | Description |
|---|---|---|---|
| `LOCAL_MODE` | `true` | — | Skip all auth — ideal for personal use on your own machine |
| `DATABASE_URL` | — | Yes (non-local) | PostgreSQL connection string e.g. `postgresql://user:pass@host/db` |
| `REDIS_URL` | `redis://redis:6379` | Yes | Redis for the job queue (Docker provides this automatically) |
| `PORT` | `3000` | — | API port |
| `ANTHROPIC_API_KEY` | — | No | Enable Claude as an extraction provider |
| `OPENAI_API_KEY` | — | No | Enable OpenAI as an extraction provider |
| `OLLAMA_URL` | `http://localhost:11434` | No | Enable Ollama for free local AI extraction |
| `OLLAMA_MODEL` | `llama3.1` | No | Which pulled Ollama model `/v1/extract` uses (e.g. `qwen3.5:4b`) |
| `BRAVE_API_KEY` | — | No | Enable `/v1/search` (2000 free req/month) |
| `WEBHOOK_SECRET` | — | No | If set, outgoing webhooks include an `X-Netleaf-Signature` HMAC for receiver verification |
| `ALLOW_PRIVATE_IPS` | `false` | — | Set `true` only for trusted local dev — disables SSRF protection |
| `EGRESS_FIREWALL_DECLARED` | `false` | — | Set `true` once a network-level egress firewall is in place (silences the H-4 startup warning) |
| `MAX_CONTENT_CHARS` | `5000000` | — | Max characters stored per scraped page (~5MB) |

### `apps/web` (the dashboard)

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | Same PostgreSQL instance as the API |
| `AUTH_SECRET` | Yes | Random secret for session encryption. Generate: `openssl rand -base64 32` |
| `AUTH_URL` | Yes | Full URL of your web deployment e.g. `https://netleaf.vercel.app` |
| `NEXT_PUBLIC_API_URL` | Yes | URL of the API e.g. `http://localhost:3000` |
| `DISABLE_REGISTRATION` | No | Set `"true"` to block new signups on public deployments |
| `AUTH_GOOGLE_ID` | No | Google OAuth client ID (optional, enables Google login) |
| `AUTH_GOOGLE_SECRET` | No | Google OAuth client secret |
| `UPSTASH_REDIS_REST_URL` | No | Enable distributed (cross-instance) rate limiting on serverless |
| `UPSTASH_REDIS_REST_TOKEN` | No | Token paired with the Upstash REST URL above |

---

## Running Without Docker

```bash
# Prerequisites: Node.js 20+, PostgreSQL 15+, Redis 7+

npm ci
cp .env.example .env
# Edit .env — set DATABASE_URL and REDIS_URL

# Run database migrations (creates all tables)
npm run db:migrate --workspace=apps/api

# Start API on port 3000
npm run dev --workspace=apps/api

# Start web dashboard on port 3001
npm run dev --workspace=apps/web
```

---

## Running Tests

```bash
# Run all 105 tests
npm test --workspace=apps/api

# Type-check both apps
npm run typecheck --workspace=apps/api
npm run typecheck --workspace=apps/web
```

Tests cover: scraper extraction, link parser, map service, search service, webhook service, diff service, SSRF guard (20 attack vectors), API routes, and Redis queue.

---

## Contributing

1. Fork and clone the repo
2. `npm ci`
3. `cp .env.example .env`
4. `npm test --workspace=apps/api` — confirm all green before you start
5. Make your changes with tests
6. Open a PR against `main`

**Guidelines:**
- File naming: `lowercase-kebab.ts`
- Tests required for all new endpoints
- Security-sensitive changes must include tests in `src/security/`

---

## Production Deployment

Netleaf is solid for **self-hosting today** (`docker compose up` — all features verified end-to-end, including LLM extraction). Before exposing it as a **public, multi-tenant service**, work through this checklist:

- [ ] **Set `LOCAL_MODE=false`** and provision API keys (the startup guard refuses `LOCAL_MODE=true` + `NODE_ENV=production`).
- [ ] **Generate strong secrets** — `AUTH_SECRET`, `POSTGRES_PASSWORD` (`openssl rand -base64 32`).
- [ ] **Set `AUTH_URL`** to your real web origin and `NEXT_PUBLIC_API_URL` to your real API origin.
- [ ] **Network egress firewall (H-4)** — block outbound to private/link-local/metadata ranges, then set `EGRESS_FIREWALL_DECLARED=true`. *Required for untrusted multi-tenant.*
- [ ] **Distributed rate limiting** — set `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` (otherwise limits are per-instance).
- [ ] **Webhook signing** — set `WEBHOOK_SECRET` so receivers can verify payloads.
- [ ] **Serve over HTTPS** (HSTS is already sent) and deploy the API somewhere reachable by the dashboard.

For single-tenant / internal use, only the secrets and HTTPS items apply.

---

## License

MIT — use it, modify it, sell it, self-host it commercially. No strings attached.

Copyright © 2026 Aditya Salgare
