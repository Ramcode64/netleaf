export type ScrapeFormat = "markdown" | "html" | "text";

export interface PageMetadata {
  title?: string;
  description?: string;
  ogImage?: string;
  language?: string;
  statusCode: number;
  scrapedAt: string;
}

export interface ScrapeResult {
  url: string;
  markdown?: string;
  html?: string;
  text?: string;
  metadata: PageMetadata;
  success: boolean;
  error?: string;
}

export type CrawlStatus = "pending" | "running" | "completed" | "failed";

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
