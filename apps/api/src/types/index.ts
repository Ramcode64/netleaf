export type ScrapeFormat = "markdown" | "html" | "text" | "links";

export interface ScrapeOptions {
  url: string;
  formats?: ScrapeFormat[];
  waitForSelector?: string;
  timeout?: number;
  includeRawHtml?: boolean;
}

export interface ScrapeResult {
  url: string;
  markdown?: string;
  html?: string;
  text?: string;
  links?: string[];
  metadata: PageMetadata;
  success: boolean;
  error?: string;
  /** Non-fatal issues, e.g. waitForSelector not found (A-1). */
  warnings?: string[];
}

export interface PageMetadata {
  title?: string;
  description?: string;
  ogImage?: string;
  language?: string;
  statusCode: number;
  scrapedAt: string;
}

export interface CrawlOptions {
  url: string;
  maxPages?: number;
  maxDepth?: number;
  allowedDomains?: string[];
  excludePatterns?: string[];
  formats?: ScrapeFormat[];
  waitForSelector?: string;
}

export type CrawlStatus = "pending" | "running" | "completed" | "failed";

export interface CrawlJob {
  id: string;
  status: CrawlStatus;
  startUrl: string;
  options: CrawlOptions;
  pages: ScrapeResult[];
  totalFound: number;
  totalScraped: number;
  createdAt: string;
  completedAt?: string;
  error?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
