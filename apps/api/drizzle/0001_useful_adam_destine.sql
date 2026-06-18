CREATE TABLE IF NOT EXISTS "crawl_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"idx" integer NOT NULL,
	"url" text NOT NULL,
	"success" boolean DEFAULT true NOT NULL,
	"status_code" integer,
	"title" text,
	"description" text,
	"markdown" text,
	"html" text,
	"text" text,
	"error" text,
	"scraped_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "crawl_pages" ADD CONSTRAINT "crawl_pages_job_id_crawl_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."crawl_jobs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "crawl_pages_job_idx_idx" ON "crawl_pages" USING btree ("job_id","idx");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "crawl_pages_job_idx_unique" ON "crawl_pages" USING btree ("job_id","idx");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "crawl_jobs_user_id_status_idx" ON "crawl_jobs" USING btree ("user_id","status");--> statement-breakpoint
ALTER TABLE "crawl_jobs" DROP COLUMN IF EXISTS "pages";