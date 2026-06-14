# Netleaf — What It Is, How It Works, and Why It Exists

> Written so that anyone — even a curious 12-year-old — can understand it.

---

## The Big Idea (in one sentence)

**Netleaf is a tool that reads websites for you and turns them into clean, organized data you can actually use.**

---

## Imagine This

You're doing a school project on the top 100 news stories of the week. You have to visit 100 different websites, read each one, copy the important parts, and paste them into a spreadsheet. That would take hours.

Now imagine a robot that does all of that in seconds — visits every website, reads the content, pulls out just what you need, and hands it to you in a neat format.

That robot is called a **web scraper**. Netleaf is a very powerful web scraper that you can run on your own computer for free.

---

## The Problem Netleaf Solves

There's already a popular tool called **Firecrawl** that does this kind of thing. But it has some problems:

- You have to pay money once you use it a lot
- You can't run it yourself — you have to use their servers (like renting a car instead of owning one)
- You can only use one AI brain (one LLM) to understand the content
- It doesn't let you set schedules ("scan this website every night at 2 AM")
- It doesn't tell you what *changed* since last time you scanned

Netleaf fixes all of these problems:

| Problem | Firecrawl | Netleaf |
|---------|-----------|---------|
| Cost | Gets expensive | **Free forever** |
| Setup | Their servers | **Your own computer** |
| AI choice | One option | **Claude, ChatGPT, or local Ollama** |
| Schedules | ❌ | ✅ |
| Change detection | ❌ | ✅ |
| Rate limits | Strict | **None** |

---

## How a Website Works (The Basics)

Before we can understand Netleaf, let's understand websites for a moment.

When you go to `https://example.com` in your browser:
1. Your browser sends a message to a computer far away ("hey, give me that page")
2. That computer sends back a big chunk of text called **HTML**
3. Your browser reads the HTML and draws the pretty page you see

HTML looks like this:
```html
<h1>Hello World</h1>
<p>This is a paragraph.</p>
<a href="https://other-site.com">Click here</a>
```

But most modern websites don't just send plain HTML. They use **JavaScript** to build the page *after* it loads. So if you just download the raw HTML, you get an empty shell — the content hasn't appeared yet.

Netleaf handles this using a tool called **Playwright**, which is basically a real browser that runs without a screen. It visits the site, waits for JavaScript to run, and *then* reads the content. That's the "scraping" part.

---

## What Netleaf Can Do (The 7 Superpowers)

### 1. Scrape — Read one page

Give Netleaf a URL. It visits the page, reads everything, and gives it back to you in a clean format.

```
You ask:  "Read https://news.ycombinator.com for me"
Netleaf:  "Here's the page as clean text, no ads, no menus"
```

You can get the content as:
- **Markdown** — clean text with headings, bold, lists (great for AI tools)
- **HTML** — the raw website code
- **Plain text** — just the words, no formatting at all

---

### 2. Crawl — Read an entire website

Scrape is for one page. Crawl is for a whole website.

```
You ask:  "Read every page on docs.example.com"
Netleaf:  "Found 87 pages. Scraping them all. Done. Here's everything."
```

How it works:
1. Visit the starting page
2. Find all the links on that page
3. Visit each link
4. Find all the links on those pages too
5. Keep going until you've hit the limit you set

This is called **recursive crawling** — like following a trail of breadcrumbs that keep branching.

Since scraping 87 pages takes a while, Netleaf uses a **job queue** (powered by a tool called BullMQ). This means:
- The crawl runs in the background
- You get a job ID immediately
- You check back later to see how it's going
- Even if the server restarts, the crawl picks up where it left off

---

### 3. Map — Find all the URLs on a site

Sometimes you don't want to read all the content — you just want to know *what pages exist*.

```
You ask:  "What pages are on docs.example.com?"
Netleaf:  "Found 312 URLs. Here they are."
```

Netleaf does this fast (no browser needed) using a 3-step strategy:
1. **Check robots.txt** — most websites have a file at `/robots.txt` that lists their sitemaps
2. **Read the sitemap** — a sitemap is like a table of contents for the whole website
3. **Scan the homepage links** — if no sitemap exists, just grab every link from the homepage

---

### 4. Extract — Pull structured data from a page

This is where AI comes in. Sometimes you don't just want the text — you want *specific information* in a specific shape.

```
You ask:  "Read this product page and give me the name, price, and rating as JSON"
Netleaf:  { "name": "Blue Shoes", "price": 49.99, "rating": 4.3 }
```

How it works:
1. Netleaf scrapes the page and gets the markdown
2. It sends that markdown to an AI with your instructions
3. The AI reads the page and fills in your template
4. Netleaf checks the AI's answer against your template (using a validator called AJV)

You can choose which AI to use:
- **Claude** (Anthropic) — smart and fast
- **GPT-4o-mini** (OpenAI) — also very capable
- **Ollama** — runs entirely on your own computer, completely free, no internet needed

---

### 5. Search — Search the web and read the results

```
You ask:  "Search for 'best open source databases' and give me the content of each result"
Netleaf:  [searches Brave, visits each result, returns the markdown of each page]
```

Netleaf uses the **Brave Search API** (2,000 free searches per month) to find results, then optionally scrapes each result page in parallel.

---

### 6. Schedule — Set it and forget it

```
You ask:  "Crawl docs.example.com every night at 2 AM"
Netleaf:  "Got it. I'll do it automatically."
```

This uses something called a **cron expression** — a little code that means "run at this time on these days". For example:
- `0 2 * * *` = every day at 2:00 AM
- `0 9 * * 1` = every Monday at 9:00 AM
- `*/30 * * * *` = every 30 minutes

Netleaf checks its schedule list every 60 seconds and starts any crawl that's due.

---

### 7. Diff — Find what changed

```
You ask:  "What changed on the docs website between yesterday's crawl and today's?"
Netleaf:  "3 pages were added, 1 was deleted, 7 were modified."
```

How it works: every time Netleaf crawls a page, it calculates a **fingerprint** of the content (using SHA-256, a math trick that turns any text into a unique short code). If the fingerprint changes, the content changed. Simple and reliable.

---

## How Netleaf Stores Data

Netleaf uses a real database called **PostgreSQL** (often called "Postgres"). Think of it as a very organized spreadsheet that can hold millions of rows and answer complex questions instantly.

Here's what gets stored:

| Table | What It Stores |
|-------|---------------|
| `users` | Accounts (email, hashed password) |
| `api_keys` | Your secret keys for using the API |
| `crawl_jobs` | Every crawl that was ever run |
| `scheduled_crawls` | Your scheduled crawl recipes |
| `crawl_snapshots` | The fingerprint of each page after each crawl |
| `usage_events` | A log of every API call you've made |

---

## How Passwords Are Protected

Netleaf never stores your actual password. Here's what happens when you sign up:

1. You type "mypassword123"
2. Netleaf runs it through a function called **bcrypt** — a one-way scrambler
3. The scrambled version (looks like `$2b$12$xK3Fg...`) is saved in the database
4. When you log in, Netleaf scrambles your password again and checks if the scrambled versions match

Even if someone stole the database, they couldn't figure out your real password.

---

## How API Keys Work

When developers want to use Netleaf programmatically (from their own code), they use an **API key** — a long secret password like `nl_a3f9c2...`.

Netleaf stores these the same way as passwords — only the SHA-256 fingerprint of the key is saved. When you send a request:

1. You send: `Authorization: Bearer nl_a3f9c2...`
2. Netleaf scrambles it with SHA-256
3. Looks up the scrambled version in the database
4. If it finds a match, you're in

---

## Local Mode — Use It Without Signing Up

By default, Netleaf runs in **LOCAL_MODE**. This means:
- No API key needed
- No account needed
- Just run it and start using it

This is perfect for running on your own computer. You only need accounts and keys if you're sharing the API with other people.

---

## The Architecture — How All the Pieces Fit Together

```
┌──────────────────────────────────────────────────────────────┐
│                        Your Computer                          │
│                                                               │
│  ┌─────────────────┐         ┌───────────────────────────┐  │
│  │  Netleaf Web    │         │     Netleaf API            │  │
│  │  (Next.js)      │◄───────►│     (Fastify)              │  │
│  │  localhost:3000 │  HTTP   │     localhost:3001          │  │
│  └─────────────────┘         └───────────┬───────────────┘  │
│                                           │                   │
│               ┌───────────────────────────┼──────────────┐   │
│               │                           │              │   │
│        ┌──────▼──────┐           ┌────────▼─────┐  ┌────▼─┐ │
│        │  PostgreSQL  │           │    Redis      │  │ LLM  │ │
│        │  (database)  │           │  (job queue)  │  │ API  │ │
│        └─────────────┘           └──────────────┘  └──────┘ │
└──────────────────────────────────────────────────────────────┘
```

- **Next.js** — the website dashboard (what you see in the browser)
- **Fastify** — the API that does the actual work
- **PostgreSQL** — stores all the data permanently
- **Redis** — a fast in-memory store for the crawl job queue
- **LLM APIs** — external AI brains for the extract feature (optional)

---

## The Monorepo — One Folder, Multiple Apps

Netleaf is organized as a **monorepo** — one big folder that contains multiple projects that share some code.

```
netleaf/
├── apps/
│   ├── api/       ← The Fastify API (the engine)
│   └── web/       ← The Next.js dashboard (the cockpit)
└── packages/
    └── shared-types/  ← TypeScript types shared between both apps
```

This means:
- The API and the website can share code (like type definitions)
- You install all packages once with `npm install` at the root
- One command (`docker compose up`) starts everything together

---

## Docker — One Command to Rule Them All

**Docker** packages the entire application into neat boxes called **containers**. Think of it like a lunchbox — everything the app needs is packed inside, so it works the same way on every computer.

When you run:
```bash
docker compose up
```

Docker automatically:
1. Starts a PostgreSQL database
2. Starts a Redis server
3. Runs database migrations (creates all the tables)
4. Starts the Netleaf API
5. Starts the Netleaf web dashboard

No manual installation. No "it works on my machine" problems.

---

## The Tech Stack — What Languages and Tools Are Used

| Layer | Technology | What It Does |
|-------|-----------|--------------|
| Language | TypeScript | Like JavaScript, but with type safety |
| API framework | Fastify | Fast web server for Node.js |
| Web framework | Next.js 15 | React-based website framework |
| Database | PostgreSQL | Stores all data |
| ORM | Drizzle | Lets you write database queries in TypeScript |
| Queue | BullMQ + Redis | Manages background jobs |
| Browser automation | Playwright | Controls a real browser headlessly |
| HTML parsing | Cheerio | Reads HTML like a parser (no browser) |
| Auth | Auth.js v5 | Handles login sessions and JWT tokens |
| Styling | Tailwind CSS | Utility-based CSS framework |
| Charts | Recharts | React chart library for the dashboard |
| Containerization | Docker | Packages the app into portable boxes |

---

## The API — How Developers Use Netleaf

Netleaf is a **REST API**, which means you interact with it by sending HTTP requests — the same kind your browser sends when it loads a page.

Here's what it looks like from a developer's perspective:

```bash
# Scrape a page
curl -X POST http://localhost:3001/v1/scrape \
  -d '{"url": "https://example.com"}'

# Start a crawl
curl -X POST http://localhost:3001/v1/crawl \
  -d '{"url": "https://example.com", "maxPages": 50}'

# Check on the crawl
curl http://localhost:3001/v1/crawl/YOUR-JOB-ID

# Download results as CSV
curl "http://localhost:3001/v1/crawl/YOUR-JOB-ID/export?format=csv"
```

Every response follows the same format:
```json
{
  "success": true,
  "data": { ... }
}
```

Or if something went wrong:
```json
{
  "success": false,
  "error": "Something went wrong"
}
```

---

## The Web Dashboard — A Visual Interface

Not everyone wants to use the command line. The dashboard at `http://localhost:3000` gives you:

- **Overview** — charts showing your usage over the last 14 days
- **API Keys** — create and revoke secret keys
- **Crawls** — see the history of every crawl you've run
- **Schedules** — manage your automated recurring crawls
- **Docs** — built-in API documentation with a "Try it" form

---

## Security — What Netleaf Does to Stay Safe

1. **Passwords hashed with bcrypt** — never stored in plain text
2. **API keys hashed with SHA-256** — even Netleaf can't recover your key
3. **JWT sessions** — login sessions are signed tokens, not stored on the server
4. **User isolation** — each user can only see their own jobs and keys
5. **Input validation** — all incoming data is checked with Zod before touching the database

---

## What Makes Netleaf Different From Similar Tools

| Tool | Problem it solves | Why Netleaf is different |
|------|--------------------|--------------------------|
| Firecrawl | Web scraping as a service | Netleaf is free and self-hosted |
| Scrapy (Python) | Web scraping framework | Netleaf is an API, no code needed to use it |
| Puppeteer | Browser automation library | Netleaf wraps this into a ready API |
| Apify | Scraping marketplace | Expensive, hosted, not yours |
| BeautifulSoup | Python HTML parser | Doesn't handle JavaScript, just HTML |

---

## Real-World Uses

- **Price tracking** — monitor product prices daily and get alerted when they drop
- **Content aggregation** — collect articles from 50 blogs into one feed
- **Competitive research** — track what your competitors are publishing
- **Documentation mirroring** — keep a local copy of external docs
- **AI training data** — collect clean markdown text for AI fine-tuning
- **Change alerts** — get notified when a government page or legal document changes
- **SEO auditing** — crawl your own site to find broken links or missing content

---

## The Name

A **leaf** is the part of a plant that captures energy from the world and turns it into something useful. The internet is the world. Websites are sources of information (energy). Netleaf captures that information and turns it into clean, usable data.

Green also stands for open source, growth, and being free — which is exactly what Netleaf is.

---

## Summary

| Question | Answer |
|----------|--------|
| What does it do? | Reads websites and turns them into clean data |
| Is it free? | Yes, MIT licensed, free forever |
| Do I need coding skills? | No — you can use the dashboard. Developers can use the API. |
| Does it work offline? | Yes, with Ollama for AI features |
| Can I automate it? | Yes — schedule crawls with cron |
| How do I start? | `docker compose up` |
| Is my data private? | Yes — everything runs on your own computer |

---

*Built with TypeScript, Fastify, Next.js, PostgreSQL, and Playwright. MIT licensed.*
