# OpenCrawl

Open source web scraping & crawling API. Turn any website into clean markdown. Self-hostable alternative to Firecrawl.

## Features

- **Scrape** — single URL → clean markdown / HTML / plain text
- **Crawl** — async BFS crawler, returns all pages as markdown
- **JS rendering** — Playwright (Chromium) handles SPAs and dynamic content
- **Smart extraction** — strips nav, footer, ads; extracts main content
- **REST API** — API key auth, rate limiting, JSON responses
- **Docker ready** — one command to run with Redis

## Quick Start

### Local (requires Redis)

```bash
# 1. Clone
git clone https://github.com/your-username/opencrawl
cd opencrawl

# 2. Install
npm install
npx playwright install chromium

# 3. Configure
cp .env.example .env
# Edit .env — set your API_KEYS

# 4. Run
npm run dev
```

### Docker (recommended)

```bash
API_KEYS=your-secret-key docker compose up
```

## API Reference

All endpoints require: `Authorization: Bearer <your-api-key>`

---

### POST /v1/scrape

Scrape a single URL.

**Request:**
```json
{
  "url": "https://example.com",
  "formats": ["markdown"],
  "waitForSelector": "#content",
  "timeout": 30000
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "url": "https://example.com",
    "markdown": "# Example Domain\n\nThis domain is for use...",
    "metadata": {
      "title": "Example Domain",
      "description": "...",
      "statusCode": 200,
      "scrapedAt": "2025-01-01T00:00:00.000Z"
    }
  }
}
```

**Formats:** `markdown` | `html` | `text` (array, default: `["markdown"]`)

---

### POST /v1/crawl

Start an async crawl job.

**Request:**
```json
{
  "url": "https://docs.example.com",
  "maxPages": 50,
  "maxDepth": 3,
  "formats": ["markdown"],
  "excludePatterns": ["/api/", "/cdn-cgi/"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "jobId": "a1b2c3d4-...",
    "statusUrl": "/v1/crawl/a1b2c3d4-..."
  }
}
```

---

### GET /v1/crawl/:jobId

Poll crawl status. Pages returned when `status === "completed"`.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "a1b2c3d4-...",
    "status": "completed",
    "totalScraped": 42,
    "pages": [ ... ]
  }
}
```

**Status values:** `pending` | `running` | `completed` | `failed`

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection |
| `API_KEYS` | `dev-key` | Comma-separated valid API keys |
| `BROWSER_POOL_SIZE` | `3` | Concurrent Playwright browsers |
| `DEFAULT_TIMEOUT_MS` | `30000` | Per-page timeout |
| `MAX_CRAWL_PAGES` | `100` | Hard cap on crawl depth |

## Architecture

```
src/
├── api/
│   ├── routes/         # POST /v1/scrape, /v1/crawl, GET /v1/crawl/:id
│   └── middleware/     # API key auth
├── scraper/
│   ├── browser.ts      # Playwright browser pool
│   ├── extract.ts      # Page scrape logic
│   └── markdown.ts     # HTML → Markdown (Turndown)
├── crawler/
│   ├── engine.ts       # BFS crawler
│   └── parser.ts       # Link extraction + filtering
├── queue/
│   └── jobs.ts         # BullMQ + Redis job queue
└── config/             # Env-based config
```

## Running Tests

```bash
npm test
```

## License

MIT
