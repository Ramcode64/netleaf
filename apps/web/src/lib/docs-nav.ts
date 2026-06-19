export const methodBadge = {
  GET:    "text-sky-300 bg-sky-900/40",
  POST:   "text-amber-300 bg-amber-900/40",
  DELETE: "text-red-300 bg-red-900/40",
  PATCH:  "text-violet-300 bg-violet-900/40",
} as const;

export type Method = keyof typeof methodBadge;

export interface NavItem {
  title: string;
  href: string;
  method?: Method;
}

export interface NavSection {
  heading: string;
  items: NavItem[];
}

export const docsNav: NavSection[] = [
  {
    heading: "Getting Started",
    items: [
      { title: "Introduction",   href: "/docs" },
      { title: "Quick Start",    href: "/docs/quickstart" },
      { title: "Authentication", href: "/docs/authentication" },
    ],
  },
  {
    heading: "API Reference",
    items: [
      { title: "Scrape a page",         href: "/docs/scrape",       method: "POST" },
      { title: "Start a crawl",         href: "/docs/crawl",        method: "POST" },
      { title: "Poll crawl status",     href: "/docs/crawl-status", method: "GET"  },
      { title: "Attach a webhook",      href: "/docs/webhook",      method: "POST" },
      { title: "Discover URLs",         href: "/docs/map",          method: "POST" },
      { title: "Structured extraction", href: "/docs/extract",      method: "POST" },
      { title: "Web search",            href: "/docs/search",       method: "POST" },
      { title: "Diff two crawls",       href: "/docs/diff",         method: "GET"  },
      { title: "Create a schedule",     href: "/docs/schedule",     method: "POST" },
      { title: "Export results",        href: "/docs/export",       method: "GET"  },
    ],
  },
  {
    heading: "System",
    items: [
      { title: "Manage API keys",       href: "/docs/keys",         method: "POST" },
      { title: "Health probe",          href: "/docs/health",       method: "GET"  },
    ],
  },
  {
    heading: "Guides",
    items: [
      { title: "Crawl a docs site",    href: "/docs/guides/crawl-docs"       },
      { title: "Local LLM extraction", href: "/docs/guides/local-extraction"  },
      { title: "Recurring crawls",     href: "/docs/guides/scheduling"        },
    ],
  },
];
