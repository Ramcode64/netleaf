import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Netleaf",
  description:
    "Self-host in one command. No rate limits. Multi-LLM extraction. A free, open-source alternative to Firecrawl.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ??
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://netleaf.vercel.app")
  ),
  openGraph: {
    title: "Netleaf — The free, open-source web data platform",
    description: "Scrape, crawl, map, extract, search, schedule. Free forever, self-hosted.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
