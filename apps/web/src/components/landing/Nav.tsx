import Link from "next/link";
import { Leaf, Github } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-ink-950/90 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2 group">
          <Leaf className="h-5 w-5 text-leaf-400 transition-transform group-hover:scale-110" />
          <span className="text-lg font-semibold tracking-tight">Netleaf</span>
        </Link>

        <div className="hidden items-center gap-7 text-sm text-ink-300 md:flex">
          <a href="#features" className="transition-colors hover:text-white">Features</a>
          <a href="#compare" className="transition-colors hover:text-white">vs Firecrawl</a>
          <a href="#pricing" className="transition-colors hover:text-white">Pricing</a>
          <Link href="/docs" className="transition-colors hover:text-white">Docs</Link>
          <a
            href="https://github.com/your-username/netleaf"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 transition-colors hover:text-white"
          >
            <Github className="h-4 w-4" />
            GitHub
          </a>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/login">
            <Button variant="ghost" size="sm" className="text-ink-300 hover:text-white">Sign in</Button>
          </Link>
          <Link href="/signup">
            <Button size="sm" className="glow-sm">Get started</Button>
          </Link>
        </div>
      </nav>
    </header>
  );
}
