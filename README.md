# Netleaf

<p align="center">
  <strong>The free, open-source web data platform.</strong><br>
  Turn any website into structured data — markdown, JSON, CSV, or LLM-ready output.<br>
  Self-host in one command. No rate limits. No credit cards. No cloud lock-in.
</p>

<p align="center">
  <a href="https://github.com/Ramcode64/netleaf/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="MIT License"></a>
  <a href="https://github.com/Ramcode64/netleaf/actions"><img src="https://github.com/Ramcode64/netleaf/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <img src="https://img.shields.io/badge/tests-95%20passing-brightgreen" alt="95 tests">
  <img src="https://img.shields.io/badge/docker-one%20command-blue" alt="Docker">
  <img src="https://img.shields.io/badge/LLM-Claude%20%7C%20OpenAI%20%7C%20Ollama-purple" alt="Multi-LLM">
</p>

---

## What is Netleaf?

Netleaf is a web scraping and crawling platform you run on your own machine or server. It takes any URL and converts it into clean, usable data — plain markdown text, structured JSON from an LLM, a full site crawl, a CSV export, or a zip of markdown files.

It is built for developers who:
- Are tired of Firecrawl's free tier running out mid-project
- Want to extract structured data using their own LLM keys (or no keys at all via Ollama)
- Need to crawl entire sites, not just individual pages
- Want change detection — know exactly what changed between two crawl runs
- Prefer owning their infrastructure and their data

One `docker compose up` and the entire stack — API, web dashboard, PostgreSQL, Redis, job queue — is running locally. No account required. No telemetry. No vendor lock-in.

---

## Quickstart

```bash
git clone https://github.com/Ramcode64/netleaf
cd netleaf
cp .env.example .env
docker compose up
```

- **API** is live at `http://localhost:3000`
- **Dashboard** is live at `http://localhost:3001`

No API key needed. `LOCAL_MODE=true` is the default — hit every endpoint immediately.

```bash
# Scrape any page to markdown in one curl
curl -X POST http://localhost:3000/v1/scrape \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "formats": ["markdown"]}'
```

---

## Why Netleaf Instead of Firecrawl, Apify, or Diffbot?

This is a direct, honest comparison. Here is where Netleaf wins, where it loses, and where it depends.

### vs Firecrawl

Firecrawl is the closest spiritual predecessor. Netleaf started as a rethink of what Firecrawl should be for self-hosters.

| | Firecrawl | Netleaf |
|---|---|---|
| **Self-hosted** | Yes, but complex setup (S3, queues, multiple configs) | Yes — single `docker compose up` |
| **Free tier** | 500 credits/month on cloud | Unlimited on your hardware |
| **LLM for extraction** | Locked to their internal stack | Your choice: Claude, OpenAI, or Ollama |
| **100% offline** | No | Yes — run Ollama locally, zero API calls |
| **Scheduled crawls** | No | Yes — cron-based, managed via UI |
| **Change detection** | No | Yes — diff any two crawl snapshots |
| **Export formats** | JSON only | JSON, CSV, XML, Markdown ZIP |
| **Local-only mode** | No — always requires auth | Yes — `LOCAL_MODE=true`, no key needed |
| **Dashboard** | Yes | Yes |
| **Open source** | AGPL (cloud is proprietary) | MIT |
| **Price at scale** | $16–$333/month | $0 forever on self-host |

**Bottom line:** If you are self-hosting, Netleaf is simpler to set up and has features Firecrawl cloud doesn't offer at any price tier (offline extraction, change detection, cron scheduling without an enterprise plan).

---

### vs Apify

Apify is a cloud-only scraping marketplace. It's powerful but fundamentally a different product — you're renting compute on their platform and running "Actors" written by third parties.

| | Apify | Netleaf |
|---|---|---|
| **Self-hostable** | No | Yes |
| **Free tier** | $5 platform credit/month | Unlimited (your hardware) |
| **Data stays on your infra** | No — stored on Apify cloud | Yes |
| **Structured LLM extraction** | Bring your own, cobbled together | Built-in, multi-provider |
| **Change detection** | No | Yes |
| **Setup complexity** | Low (managed cloud) | Low (`docker compose up`) |
| **Cost at scale** | $49–$499/month | $0 |

**Bottom line:** Apify is great if you don't want to run any infrastructure. Netleaf is for when you want to own your stack completely — your data never leaves your machine.

---

### vs Diffbot

Diffbot is an enterprise AI web extraction product. It uses computer vision and ML to understand page structure automatically — impressive tech, but priced for enterprise buyers.

| | Diffbot | Netleaf |
|---|---|---|
| **Pricing** | $299–$999/month | $0 |
| **Self-hostable** | No | Yes |
| **Custom extraction schemas** | Yes | Yes (via JSON Schema + LLM) |
| **Automatic type detection** | Yes (proprietary ML) | No — you define the schema |
| **Bulk crawling** | Yes | Yes |
| **Open source** | No | MIT |

**Bottom line:** Diffbot is better at automatic content classification if you have a budget. Netleaf wins on cost, privacy, and flexibility for teams who know what data they want.

---

### vs Crawlee (by Apify)

Crawlee is an open-source Node.js scraping library — not a platform. You write the scraping code yourself using their abstractions.

| | Crawlee | Netleaf |
|---|---|---|
| **Type** | Code library | Full platform (API + UI) |
| **Web dashboard** | No | Yes |
| **REST API** | No — you build it | Yes, ready to use |
| **LLM extraction** | No | Yes |
| **Scheduled crawls** | No | Yes |
| **Change detection** | No | Yes |
| **Best for** | Custom scrapers you code yourself | General-purpose scraping with no code |

**Bottom line:** Crawlee is for engineers who want full control at the code level. Netleaf is for when you want a ready-made API and don't want to write boilerplate infrastructure.

---

## API Reference

All endpoints return `{ success: boolean, data: ... }`. In local mode, no `Authorization` header is needed. In multi-user mode: `Authorization: Bearer nl_your_key`.

### `POST /v1/scrape` — Convert a page to markdown / HTML / text

Fetches a single URL using a headless Chromium browser (via Playwright), handles JS-rendered pages, and returns the content in whichever formats you request.

```bash
curl -X POST http://localhost:3000/v1/scrape \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://news.ycombinator.com",
    "formats": ["markdown", "html"],
    "waitFor": 1000
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "url": "https://news.ycombinator.com",
    "markdown": "# Hacker News\n\n...",
    "html": "<html>...",
    "metadata": { "title": "Hacker News", "statusCode": 200, "scrapedAt": "..." }
  }
}
```

**Options:** `formats` (`markdown` `html` `text`) · `waitFor` (ms to wait for JS) · `excludeTags` (HTML tags to strip)

---

### `POST /v1/crawl` — Crawl an entire site

Starts an async BFS crawl from a starting URL. Follows internal links up to `maxPages`. Returns a `jobId` immediately; poll for results.

```bash
# Start crawl
curl -X POST http://localhost:3000/v1/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://docs.example.com",
    "maxPages": 100,
    "formats": ["markdown"],
    "webhookUrl": "https://your-app.com/webhook"
  }'
# → { "success": true, "data": { "jobId": "abc-123" } }

# Poll status
curl http://localhost:3000/v1/crawl/abc-123
# → { "status": "running", "totalScraped": 34, "totalFound": 89, "pages": [...] }

# Export when done
curl "http://localhost:3000/v1/crawl/abc-123/export?format=csv" -o results.csv
```

**Export formats:** `json` · `csv` · `xml` · `zip` (one `.md` file per page)

---

### `POST /v1/map` — Discover all URLs on a site (no browser needed)

Fast URL discovery without Playwright. Checks `robots.txt` → sitemap → homepage links. Returns up to 1000 URLs in under 2 seconds.

```bash
curl -X POST http://localhost:3000/v1/map \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "limit": 500, "includeSubdomains": false}'
```

```json
{
  "success": true,
  "data": {
    "source": "sitemap",
    "links": ["https://example.com/about", "https://example.com/blog", "..."],
    "total": 147
  }
}
```

---

### `POST /v1/extract` — LLM-powered structured data extraction

Scrape a page, then ask an LLM to extract specific fields according to a JSON Schema you define. Works with Claude, OpenAI, or local Ollama — no cloud required.

```bash
curl -X POST http://localhost:3000/v1/extract \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://shop.example.com/product/123",
    "schema": {
      "type": "object",
      "properties": {
        "name":     { "type": "string" },
        "price":    { "type": "number" },
        "inStock":  { "type": "boolean" },
        "reviews":  { "type": "integer" }
      },
      "required": ["name", "price"]
    },
    "provider": "ollama"
  }'
```

```json
{
  "success": true,
  "data": { "name": "Wireless Headphones", "price": 79.99, "inStock": true, "reviews": 312 }
}
```

**Providers:**
- `claude` — set `ANTHROPIC_API_KEY`, uses `claude-haiku-4-5` (fast + cheap)
- `openai` — set `OPENAI_API_KEY`, uses `gpt-4o-mini`
- `ollama` — set `OLLAMA_URL`, uses whatever model you have pulled locally. **Zero API cost. Runs 100% offline.**

---

### `POST /v1/search` — Web search + optional scrape

Searches the web via Brave Search and optionally scrapes the top results.

```bash
curl -X POST http://localhost:3000/v1/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "best open source web scraping tools 2025",
    "maxResults": 5,
    "scrape": true,
    "formats": ["markdown"]
  }'
```

Returns search results with `title`, `description`, `url`, and optionally the full `markdown` of each page. Requires `BRAVE_API_KEY` (2000 free queries/month at search.brave.com).

---

### `POST /v1/schedule` — Cron-scheduled crawls

Create recurring crawl jobs on any cron schedule. Managed via API or the web dashboard.

```bash
# Create a schedule
curl -X POST http://localhost:3000/v1/schedule \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Daily competitor check",
    "cronExpression": "0 8 * * *",
    "url": "https://competitor.com",
    "maxPages": 50,
    "webhookUrl": "https://your-app.com/on-crawl-complete"
  }'

# List schedules
curl http://localhost:3000/v1/schedule

# Pause / delete
curl -X PATCH http://localhost:3000/v1/schedule/<id> -d '{"isActive": false}'
curl -X DELETE http://localhost:3000/v1/schedule/<id>
```

---

### `GET /v1/diff` — Change detection between crawl runs

Compare two crawl snapshots. Netleaf hashes the markdown content of each page on every crawl. The diff endpoint tells you exactly what was added, removed, or changed between any two runs.

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

Use this to monitor competitor websites, track documentation changes, or build alerts when content updates.

---

## Architecture

```
netleaf/
├── apps/
│   ├── api/                    # Fastify REST API (TypeScript + ESM)
│   │   └── src/
│   │       ├── scraper/        # Playwright browser pool — headless Chromium
│   │       ├── crawler/        # BFS engine + link parser (cheerio)
│   │       ├── queue/          # BullMQ + Redis async job queue
│   │       ├── db/             # Drizzle ORM + PostgreSQL (schema, migrations)
│   │       ├── security/       # SSRF egress guard, Zod validators
│   │       ├── services/       # map · extract · search · diff · scheduler · webhook
│   │       └── api/routes/     # scrape · crawl · map · extract · search · schedule · export · diff · keys
│   │
│   └── web/                    # Next.js 15 dashboard (App Router)
│       └── src/
│           ├── app/            # landing, auth, dashboard, docs, API routes
│           ├── components/     # landing sections, dashboard widgets, docs Try-It UI
│           └── lib/            # auth (Auth.js v5), db (Drizzle), server actions
│
└── packages/
    └── shared-types/           # TypeScript types shared between API and web
```

**Tech stack:** Fastify · Playwright · BullMQ · Drizzle ORM · PostgreSQL · Redis · Next.js 15 · Tailwind CSS · shadcn/ui · Auth.js v5 · Vitest · Docker

---

## Security

Netleaf is designed to be safe to expose as a service, not just a personal tool.

- **SSRF protection** — all user-supplied URLs pass through an egress guard that blocks private IPs (10.x, 172.16.x, 192.168.x, 169.254.169.254 cloud metadata), loopback, IPv6 ULA, and IPv4-mapped IPv6 in both forms. Redirect chains are validated hop-by-hop so a public URL cannot `302 →` internal.
- **Scheme allowlist** — `file://`, `javascript:`, `ftp://`, `data:` are rejected at parse time before any fetch.
- **AJV schema limits** — `/v1/extract` schemas are capped at 50KB, depth ≤ 20, and `$ref`/`$data` are rejected to prevent ReDoS and memory exhaustion.
- **Rate limiting** — keyed on bearer token hash (not user ID), so it works before auth middleware runs.
- **CSV injection prevention** — exported cells starting with `= + - @ \t \r` are prefixed with `'`.
- **No account enumeration** — registration uses constraint-violation catch, not check-then-insert.
- **95 tests, all passing** — including a dedicated SSRF test suite covering 20 attack vectors.

---

## Environment Variables

| Variable | Default | Required | Description |
|---|---|---|---|
| `LOCAL_MODE` | `true` | — | Skip all auth. Ideal for personal use. |
| `DATABASE_URL` | — | Yes (non-local) | PostgreSQL connection string |
| `REDIS_URL` | `redis://redis:6379` | Yes | Redis for job queue |
| `PORT` | `3000` | — | API port |
| `AUTH_SECRET` | — | Yes (web) | Auth.js v5 secret. Generate: `openssl rand -base64 32` |
| `ANTHROPIC_API_KEY` | — | No | Claude extraction provider |
| `OPENAI_API_KEY` | — | No | OpenAI extraction provider |
| `OLLAMA_URL` | `http://localhost:11434` | No | Ollama for free local extraction |
| `BRAVE_API_KEY` | — | No | Brave Search for `/v1/search` |
| `ALLOW_PRIVATE_IPS` | `false` | — | Set `true` only for trusted local dev scraping |
| `MAX_CONTENT_CHARS` | `5000000` | — | Max characters stored per scraped page (5MB) |

---

## Ollama Setup — 100% Offline Extraction

No API key. No cloud. No cost. Extract structured data entirely on your own GPU.

```bash
# Install Ollama (Mac/Linux)
curl -fsSL https://ollama.ai/install.sh | sh

# Pull a model (llama3.2 is fast and small)
ollama pull llama3.2

# Start Netleaf (Ollama runs on your host, Docker container reaches it via host.docker.internal)
OLLAMA_URL=http://host.docker.internal:11434 docker compose up
```

Then use `"provider": "ollama"` in `/v1/extract`. The scrape + LLM extraction loop never leaves your machine.

---

## Running Without Docker

```bash
# Prerequisites: Node.js 20+, PostgreSQL, Redis

npm ci
cp .env.example .env
# Edit .env — set DATABASE_URL and REDIS_URL

# Run migrations
npm run db:migrate --workspace=apps/api

# Start API (port 3000)
npm run dev --workspace=apps/api

# Start web dashboard (port 3001)
npm run dev --workspace=apps/web
```

---

## Dashboard Features

The Next.js dashboard at `http://localhost:3001` includes:

- **Landing page** — feature overview, comparison table, live code demo
- **Auth** — email/password signup and login (Auth.js v5, JWT sessions), optional Google OAuth
- **API keys** — create named keys (raw key shown once, SHA-256 hashed at rest), revoke at any time
- **Overview** — 14-day request chart + endpoint breakdown
- **Crawls** — full job history with status, page count, and export links
- **Schedules** — create and manage cron jobs via UI, pause/resume without deleting
- **Docs** — full endpoint reference at `/docs` with live "Try It" forms per endpoint

---

## Running Tests

```bash
# All 95 tests
npm test --workspace=apps/api

# Type check both apps
npm run typecheck --workspace=apps/api
npm run typecheck --workspace=apps/web
```

Tests cover: scraper extraction, link parser, map service, search service, webhook service, diff service, SSRF guard (20 attack vectors), server routes, and Redis queue.

---

## Contributing

1. Fork and clone
2. `npm ci`
3. `cp .env.example .env`
4. `npm test --workspace=apps/api` — all green before you start
5. Open a PR against `main`

File naming: `lowercase-kebab.ts`. Tests required for new endpoints. Security-sensitive changes must include or update tests in `src/security/`.

---

## License

MIT — use it, modify it, sell it, self-host it. No strings.

Copyright (c) 2026 Aditya Salgare
