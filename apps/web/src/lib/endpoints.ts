export interface ParamDef {
  name: string;
  type: string;
  required: boolean;
  description: string;
  default?: string;
}

export interface EndpointDoc {
  id: string;
  method: "GET" | "POST" | "DELETE" | "PATCH";
  path: string;
  title: string;
  description: string;
  bodyParams?: ParamDef[];
  queryParams?: ParamDef[];
  curl: string;
  exampleRequest?: string;
  exampleResponse: string;
}

export const endpoints: EndpointDoc[] = [
  {
    id: "scrape",
    method: "POST",
    path: "/v1/scrape",
    title: "Scrape a page",
    description:
      "Scrapes a single URL using a headless Playwright browser. Handles JavaScript-rendered content, cookie consent overlays, and lazy-loaded images. Returns the page content in one or more formats.",
    bodyParams: [
      { name: "url", type: "string", required: true, description: "The URL to scrape" },
      {
        name: "formats",
        type: "string[]",
        required: false,
        description: 'Content formats to return. Options: "markdown", "html", "text", "links"',
        default: '["markdown"]',
      },
      {
        name: "waitForSelector",
        type: "string",
        required: false,
        description: "CSS selector to wait for before extracting content",
      },
      {
        name: "timeout",
        type: "number",
        required: false,
        description: "Navigation timeout in milliseconds (1000-60000)",
        default: "30000",
      },
    ],
    curl: `curl -X POST http://localhost:3000/v1/scrape \\
  -H "Content-Type: application/json" \\
  -d '{"url":"https://example.com","formats":["markdown"]}'`,
    exampleRequest: `{
  "url": "https://example.com",
  "formats": ["markdown", "html"]
}`,
    exampleResponse: `{
  "success": true,
  "data": {
    "url": "https://example.com",
    "title": "Example Domain",
    "markdown": "# Example Domain\\n\\nThis domain is for use in examples...",
    "html": "<html>...</html>",
    "metadata": { "statusCode": 200, "loadedAt": "2026-06-13T10:00:00Z" }
  }
}`,
  },
  {
    id: "crawl",
    method: "POST",
    path: "/v1/crawl",
    title: "Start a crawl",
    description:
      "Recursively crawls a website starting from the given URL. Runs asynchronously via a BullMQ job queue. Each page is scraped with Playwright and stored to PostgreSQL. Returns a jobId to poll for progress.",
    bodyParams: [
      { name: "url", type: "string", required: true, description: "Starting URL for the crawl" },
      {
        name: "maxPages",
        type: "number",
        required: false,
        description: "Stop after this many pages",
        default: "50",
      },
      {
        name: "maxDepth",
        type: "number",
        required: false,
        description: "Maximum link depth from the start URL",
        default: "3",
      },
      {
        name: "formats",
        type: "string[]",
        required: false,
        description: "Content formats per page",
        default: '["markdown"]',
      },
      {
        name: "webhookUrl",
        type: "string",
        required: false,
        description: "URL to POST the completed results to",
      },
    ],
    curl: `curl -X POST http://localhost:3000/v1/crawl \\
  -H "Content-Type: application/json" \\
  -d '{"url":"https://docs.example.com","maxPages":100}'`,
    exampleRequest: `{
  "url": "https://docs.example.com",
  "maxPages": 100,
  "maxDepth": 4,
  "formats": ["markdown"]
}`,
    exampleResponse: `{
  "success": true,
  "data": { "jobId": "c3d4e5f6-..." }
}`,
  },
  {
    id: "crawl-status",
    method: "GET",
    path: "/v1/crawl/:id",
    title: "Poll crawl status",
    description:
      "Returns the current status and results of a crawl job. Poll this endpoint until status is \"completed\" or \"failed\". Pages array grows as the crawl progresses.",
    queryParams: [
      { name: "id", type: "string", required: true, description: "Job ID returned by POST /v1/crawl" },
    ],
    curl: `curl http://localhost:3000/v1/crawl/c3d4e5f6-...`,
    exampleResponse: `{
  "success": true,
  "data": {
    "id": "c3d4e5f6-...",
    "status": "completed",
    "startUrl": "https://docs.example.com",
    "totalFound": 87,
    "totalScraped": 87,
    "pages": [
      { "url": "https://docs.example.com/intro", "title": "Introduction", "markdown": "..." }
    ],
    "createdAt": "2026-06-13T10:00:00Z",
    "completedAt": "2026-06-13T10:02:33Z"
  }
}`,
  },
  {
    id: "webhook",
    method: "POST",
    path: "/v1/crawl/:id/webhook",
    title: "Attach a webhook",
    description:
      "Attaches a webhook URL to an existing crawl job. When the crawl completes, Netleaf will POST the full results to this URL. Retries up to 3 times with exponential backoff on failure. Returns 409 if the job already finished.",
    bodyParams: [
      {
        name: "webhookUrl",
        type: "string",
        required: true,
        description: "HTTPS endpoint to receive the crawl payload",
      },
    ],
    curl: `curl -X POST http://localhost:3000/v1/crawl/c3d4e5f6-.../webhook \\
  -H "Content-Type: application/json" \\
  -d '{"webhookUrl":"https://your-app.com/hook"}'`,
    exampleRequest: `{ "webhookUrl": "https://your-app.com/hook" }`,
    exampleResponse: `{ "success": true }`,
  },
  {
    id: "map",
    method: "POST",
    path: "/v1/map",
    title: "Discover URLs",
    description:
      "Fast URL discovery without Playwright. Uses a 3-tier strategy: (1) parse robots.txt for Sitemap directives, (2) parse sitemap XML recursively one level deep, (3) fall back to homepage link extraction with Cheerio. Returns deduplicated, same-domain URLs sorted by path.",
    bodyParams: [
      { name: "url", type: "string", required: true, description: "Site root URL" },
      {
        name: "limit",
        type: "number",
        required: false,
        description: "Maximum URLs to return",
        default: "100",
      },
      {
        name: "includeSubdomains",
        type: "boolean",
        required: false,
        description: "Include links to subdomains",
        default: "false",
      },
    ],
    curl: `curl -X POST http://localhost:3000/v1/map \\
  -H "Content-Type: application/json" \\
  -d '{"url":"https://example.com","limit":500}'`,
    exampleRequest: `{
  "url": "https://example.com",
  "limit": 500
}`,
    exampleResponse: `{
  "success": true,
  "data": {
    "links": [
      "https://example.com/",
      "https://example.com/about",
      "https://example.com/docs"
    ],
    "total": 3,
    "source": "sitemap"
  }
}`,
  },
  {
    id: "extract",
    method: "POST",
    path: "/v1/extract",
    title: "Structured extraction",
    description:
      "Scrapes a URL then passes the page content to an LLM to extract structured data matching a JSON schema. Supports Claude (Anthropic), GPT-4o-mini (OpenAI), and Ollama (local, free, fully offline). Validates output with AJV; retries once with error context if invalid.",
    bodyParams: [
      { name: "url", type: "string", required: true, description: "Page to extract from" },
      {
        name: "schema",
        type: "object",
        required: true,
        description: "JSON Schema describing the shape of the data to extract",
      },
      {
        name: "instructions",
        type: "string",
        required: false,
        description: "Extra instructions appended to the LLM prompt (max 4096 chars)",
      },
      {
        name: "provider",
        type: "string",
        required: false,
        description: '"claude" | "openai" | "ollama" | "auto"',
        default: '"auto"',
      },
    ],
    curl: `curl -X POST http://localhost:3000/v1/extract \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://news.ycombinator.com",
    "provider": "ollama",
    "schema": {
      "type": "object",
      "properties": {
        "topStories": { "type": "array", "items": { "type": "string" } }
      },
      "required": ["topStories"]
    }
  }'`,
    exampleRequest: `{
  "url": "https://news.ycombinator.com",
  "provider": "ollama",
  "schema": {
    "type": "object",
    "properties": {
      "topStories": {
        "type": "array",
        "items": { "type": "string" }
      }
    },
    "required": ["topStories"]
  }
}`,
    exampleResponse: `{
  "success": true,
  "data": {
    "topStories": [
      "Ask HN: What are you working on?",
      "LLMs are getting cheaper"
    ]
  },
  "meta": { "provider": "ollama", "model": "llama3" }
}`,
  },
  {
    id: "search",
    method: "POST",
    path: "/v1/search",
    title: "Web search",
    description:
      "Runs a search via the Brave Search API (2000 free queries/month) and optionally scrapes each result URL in parallel using the Playwright browser pool. Requires BRAVE_API_KEY in your environment.",
    bodyParams: [
      { name: "query", type: "string", required: true, description: "Search query" },
      {
        name: "maxResults",
        type: "number",
        required: false,
        description: "Number of results to return (max 10)",
        default: "5",
      },
      {
        name: "scrape",
        type: "boolean",
        required: false,
        description: "Scrape each result URL and include markdown content",
        default: "true",
      },
      {
        name: "formats",
        type: "string[]",
        required: false,
        description: "Content formats when scrape is true",
        default: '["markdown"]',
      },
    ],
    curl: `curl -X POST http://localhost:3000/v1/search \\
  -H "Content-Type: application/json" \\
  -d '{"query":"open source web scrapers","maxResults":5,"scrape":false}'`,
    exampleRequest: `{
  "query": "open source web scrapers",
  "maxResults": 5,
  "scrape": false
}`,
    exampleResponse: `{
  "success": true,
  "data": {
    "results": [
      {
        "url": "https://github.com/apify/crawlee",
        "title": "Crawlee — web scraping library",
        "description": "A fast, reliable crawler for Node.js..."
      }
    ],
    "total": 5
  }
}`,
  },
  {
    id: "diff",
    method: "GET",
    path: "/v1/diff",
    title: "Diff two crawls",
    description:
      "Compares the crawl snapshots from two different job runs using SHA-256 content hashes. Returns which pages were added, removed, changed, or unchanged between the two crawls. Useful for change monitoring.",
    queryParams: [
      { name: "jobIdA", type: "string", required: true, description: "Earlier crawl job ID" },
      { name: "jobIdB", type: "string", required: true, description: "Later crawl job ID" },
    ],
    curl: `curl "http://localhost:3000/v1/diff?jobIdA=aaa...&jobIdB=bbb..."`,
    exampleResponse: `{
  "success": true,
  "data": {
    "summary": { "added": 3, "removed": 1, "changed": 7, "unchanged": 76 },
    "added": [{ "url": "https://example.com/new-page" }],
    "removed": [{ "url": "https://example.com/deleted" }],
    "changed": [{ "url": "https://example.com/about", "hashA": "abc...", "hashB": "def..." }]
  }
}`,
  },
  {
    id: "schedule",
    method: "POST",
    path: "/v1/schedule",
    title: "Create a schedule",
    description:
      "Creates a cron-based recurring crawl. Netleaf's in-process scheduler polls every 60 seconds and enqueues a crawl job whenever nextRunAt is past. Validates the cron expression before saving.",
    bodyParams: [
      { name: "name", type: "string", required: true, description: "Human-readable label" },
      {
        name: "cronExpression",
        type: "string",
        required: true,
        description: "Standard 5-field cron expression (≥5-minute interval). e.g. '0 2 * * *' for 2 AM daily",
      },
      { name: "url", type: "string", required: true, description: "URL to crawl on each run" },
      {
        name: "maxPages",
        type: "number",
        required: false,
        description: "Maximum pages to crawl per run (1-1000)",
        default: "100",
      },
      {
        name: "formats",
        type: "string[]",
        required: false,
        description: 'Content formats to extract per page',
        default: '["markdown"]',
      },
      {
        name: "webhookUrl",
        type: "string",
        required: false,
        description: "HTTPS URL to POST results to when each run completes",
      },
    ],
    curl: `curl -X POST http://localhost:3000/v1/schedule \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Nightly docs","cronExpression":"0 2 * * *","url":"https://docs.example.com","maxPages":200}'`,
    exampleRequest: `{
  "name": "Nightly docs",
  "cronExpression": "0 2 * * *",
  "url": "https://docs.example.com",
  "maxPages": 200
}`,
    exampleResponse: `{
  "success": true,
  "data": {
    "id": "s1a2b3c4-...",
    "name": "Nightly docs",
    "cronExpression": "0 2 * * *",
    "nextRunAt": "2026-06-14T02:00:00Z",
    "isActive": true
  }
}`,
  },
  {
    id: "export",
    method: "GET",
    path: "/v1/crawl/:id/export",
    title: "Export crawl results",
    description:
      "Downloads all pages from a completed crawl job in the requested format. CSV includes url, title, and markdown columns. XML wraps each page with CDATA to preserve special characters. ZIP contains one .md file per page named by URL slug.",
    queryParams: [
      { name: "id", type: "string", required: true, description: "Crawl job ID" },
      {
        name: "format",
        type: "string",
        required: false,
        description: '"csv" | "xml" | "zip"',
        default: '"csv"',
      },
    ],
    curl: `curl "http://localhost:3000/v1/crawl/c3d4e5f6-.../export?format=zip" -o results.zip`,
    exampleResponse: `(binary file download — Content-Type varies by format)
csv  → text/csv
xml  → application/xml
zip  → application/zip`,
  },
  {
    id: "health",
    method: "GET",
    path: "/health",
    title: "Health probe",
    description:
      "Returns 200 with `{status: \"ok\", version: \"…\"}` whenever the API process is running. Suitable for Docker healthchecks, Vercel cron probes, or load-balancer liveness checks. Does NOT verify DB / Redis connectivity — it's a process-up signal, not a full readiness probe.",
    curl: `curl http://localhost:3000/health`,
    exampleResponse: `{
  "status": "ok",
  "version": "0.1.0"
}`,
  },
  {
    id: "keys",
    method: "POST",
    path: "/v1/keys",
    title: "Manage API keys",
    description:
      "Create, list, and revoke per-user API keys. Disabled in LOCAL_MODE (auth is bypassed there, so keys are meaningless). All endpoints require an existing Bearer token. The full key value is shown ONLY in the create response — only the SHA-256 hash is stored.",
    bodyParams: [
      { name: "name", type: "string", required: true, description: "Human-readable label (max 100 chars)" },
    ],
    curl: `curl -X POST http://localhost:3000/v1/keys \\
  -H "Authorization: Bearer YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"CI pipeline"}'`,
    exampleRequest: `{ "name": "CI pipeline" }`,
    exampleResponse: `{
  "success": true,
  "data": {
    "id": "k1a2b3c4-...",
    "name": "CI pipeline",
    "key": "nl_…",
    "prefix": "nl_abc12345",
    "createdAt": "2026-06-20T15:00:00Z"
  }
}`,
  },
];

export function getEndpoint(id: string): EndpointDoc | undefined {
  return endpoints.find((e) => e.id === id);
}
