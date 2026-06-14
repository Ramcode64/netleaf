# Netleaf

**The free, open-source web data platform.** Self-host in one command. No rate limits. Multi-LLM.

> A better alternative to Firecrawl — free forever on your own hardware.

---

## Quickstart

```bash
git clone https://github.com/Ramcode64/netleaf
cd netleaf
cp .env.example .env        # LOCAL_MODE=true by default — no API key needed
docker compose up
```

API is live at `http://localhost:3001`. No signup required in local mode.

---

## API Reference

All endpoints accept and return JSON. In local mode, skip the `Authorization` header.  
In multi-user mode: `Authorization: Bearer nl_your_api_key`

### `POST /v1/scrape` — Scrape a single page

```bash
curl -X POST http://localhost:3001/v1/scrape \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "formats": ["markdown", "html"]}'
```

**Response:** `{ success, data: { url, markdown, html, metadata } }`

---

### `POST /v1/crawl` — Crawl an entire site

```bash
curl -X POST http://localhost:3001/v1/crawl \
  -d '{"url": "https://docs.example.com", "maxPages": 50, "formats": ["markdown"]}'
```

**Response:** `{ success, data: { jobId } }`

```bash
# Poll for results
curl http://localhost:3001/v1/crawl/<jobId>
```

---

### `POST /v1/map` — Fast URL discovery

```bash
curl -X POST http://localhost:3001/v1/map \
  -d '{"url": "https://example.com", "limit": 500}'
```

Checks `robots.txt` → sitemap → homepage links. Returns up to 1000 URLs in under 2 seconds.

---

### `POST /v1/extract` — Multi-LLM structured extraction

```bash
curl -X POST http://localhost:3001/v1/extract \
  -d '{
    "url": "https://example.com/product",
    "schema": {
      "type": "object",
      "properties": {
        "name": { "type": "string" },
        "price": { "type": "number" }
      },
      "required": ["name", "price"]
    },
    "provider": "ollama"
  }'
```

**Providers:** `claude` · `openai` · `ollama` (default: auto — first configured)  
Set `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, or point `OLLAMA_URL` at your local Ollama instance.

---

### `POST /v1/search` — Web search + scrape

```bash
curl -X POST http://localhost:3001/v1/search \
  -d '{"query": "open source web scraping tools", "maxResults": 5, "scrape": true}'
```

Requires `BRAVE_API_KEY` (2000 free queries/month at search.brave.com).

---

### `POST /v1/schedule` — Scheduled crawls

```bash
curl -X POST http://localhost:3001/v1/schedule \
  -d '{
    "name": "Daily docs crawl",
    "cronExpression": "0 2 * * *",
    "url": "https://docs.example.com",
    "maxPages": 100
  }'
```

**Other methods:** `GET /v1/schedule` · `DELETE /v1/schedule/:id` · `PATCH /v1/schedule/:id`

---

### `GET /v1/diff` — Change detection

```bash
curl "http://localhost:3001/v1/diff?jobIdA=<uuid>&jobIdB=<uuid>"
```

Compares two crawl snapshots — returns added, removed, changed, unchanged pages.

---

### `GET /v1/crawl/:id/export` — Export crawl results

```bash
# CSV
curl "http://localhost:3001/v1/crawl/<id>/export?format=csv" -o crawl.csv

# XML
curl "http://localhost:3001/v1/crawl/<id>/export?format=xml" -o crawl.xml

# ZIP (one .md file per page)
curl "http://localhost:3001/v1/crawl/<id>/export?format=zip" -o crawl.zip
```

---

## Netleaf vs Firecrawl

| Feature | Firecrawl | Netleaf |
|---------|-----------|---------|
| Self-hosted | ✅ (complex) | ✅ `docker compose up` |
| Rate limits | Strict free tier | None on self-host |
| LLM provider | One (locked) | Claude · OpenAI · Ollama |
| Scheduled crawls | ❌ | ✅ cron-based |
| Change detection | ❌ | ✅ diff between runs |
| Export formats | JSON | JSON · CSV · XML · ZIP |
| Local mode | ❌ | ✅ no auth needed |
| Price | $$ for scale | **Free forever** |

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `LOCAL_MODE` | `true` | Skip all auth — ideal for personal use |
| `DATABASE_URL` | — | PostgreSQL connection string |
| `REDIS_URL` | `redis://redis:6379` | Redis for job queue |
| `PORT` | `3001` | API port |
| `ANTHROPIC_API_KEY` | — | Claude extraction (optional) |
| `OPENAI_API_KEY` | — | OpenAI extraction (optional) |
| `OLLAMA_URL` | `http://localhost:11434` | Ollama for free local extraction |
| `BRAVE_API_KEY` | — | Brave Search for `/v1/search` |

---

## Ollama Setup (100% offline extraction)

```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Pull a model
ollama pull llama3.2

# Run Netleaf with Ollama
OLLAMA_URL=http://host.docker.internal:11434 docker compose up
```

Then use `"provider": "ollama"` in `/v1/extract` — zero API costs, runs fully local.

---

## Self-Host Guide

**Requirements:** Docker + Docker Compose (or Node.js 20 + PostgreSQL + Redis)

### Docker (recommended)

```bash
docker compose up -d          # start all services
docker compose logs -f api    # tail logs
docker compose down           # stop
```

### Bare metal

```bash
npm ci
cp .env.example .env
# Fill in DATABASE_URL and REDIS_URL

cd apps/api
npm run db:migrate
npm run dev
```

---

## Dashboard

The web dashboard (`apps/web`, Next.js 15) runs at `http://localhost:3001`:

- **Landing page** — features, Firecrawl comparison, live code demo
- **Auth** — email/password (Auth.js v5, JWT sessions) + optional Google OAuth
- **API keys** — create (raw key shown once, SHA-256 hashed), list, revoke
- **Overview** — 14-day request chart (Recharts) + usage summary
- **Crawls** — recent job history with status
- **Schedules** — manage cron-scheduled crawls (pause / delete)
- **Docs** — full endpoint reference at `/docs`

```bash
cp apps/web/.env.example apps/web/.env   # set AUTH_SECRET + DATABASE_URL
npm run dev:web                           # or `docker compose up`
```

## Architecture

```
netleaf/
├── apps/api/          # Fastify API (TypeScript, ESM)
│   ├── src/scraper/   # Playwright browser pool
│   ├── src/crawler/   # BFS link crawler
│   ├── src/queue/     # BullMQ + Redis job queue
│   ├── src/db/        # Drizzle ORM + PostgreSQL
│   └── src/services/  # map · extract · search · diff · scheduler · webhook
└── apps/web/          # Next.js 15 dashboard
    └── src/
        ├── app/        # landing, auth, dashboard, docs, API routes
        ├── components/ # landing sections + dashboard widgets
        └── lib/        # auth, db, server actions
```

---

## Contributing

1. Fork + clone
2. `npm ci`
3. `cp apps/api/.env.example apps/api/.env`
4. `npm test --workspace=apps/api` — 72 tests, all green

PRs welcome. File naming: lowercase-kebab. Tests required for new endpoints.

---

## License

MIT — free forever.
