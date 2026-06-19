import Link from "next/link";
import { Leaf, Github, Info } from "lucide-react";
import { SignupForm } from "./SignupForm";

// Registration is gated by env so the public showcase deploy can disable account
// creation without taking the page offline — visitors still get useful context.
export default function SignupPage() {
  const disabled = process.env.DISABLE_REGISTRATION === "true";

  return (
    <div className="flex min-h-screen items-center justify-center bg-grid px-6">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2">
          <Leaf className="h-6 w-6 text-leaf-400" />
          <span className="text-xl font-semibold">Netleaf</span>
        </Link>
        <div className="rounded-xl border border-white/10 bg-ink-900/70 p-6">
          {disabled ? (
            <DisabledNotice />
          ) : (
            <>
              <h1 className="text-xl font-semibold">Create your account</h1>
              <p className="mt-1 text-sm text-ink-100">Free forever. No card required.</p>
              <SignupForm />
              <p className="mt-4 text-center text-sm text-ink-100">
                Already have an account?{" "}
                <Link href="/login" className="text-leaf-400 hover:underline">
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function DisabledNotice() {
  return (
    <>
      <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-amber-100">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="text-sm">
          <p className="font-medium">Showcase mode — registration disabled</p>
          <p className="mt-1 text-amber-100/80">
            This public deployment is a preview of the dashboard. To create an account, run
            Netleaf locally and remove <code className="font-mono text-xs">DISABLE_REGISTRATION</code>{" "}
            from your env.
          </p>
        </div>
      </div>
      <div className="space-y-2">
        <a
          href="https://github.com/Ramcode64/netleaf"
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-ink-950 px-3 py-2 text-sm text-white transition-colors hover:border-leaf-500/40 hover:bg-leaf-500/5"
        >
          <Github className="h-4 w-4" /> View on GitHub
        </a>
        <Link
          href="/docs"
          className="block rounded-lg border border-white/10 bg-ink-950 px-3 py-2 text-center text-sm text-white transition-colors hover:border-leaf-500/40 hover:bg-leaf-500/5"
        >
          Read the docs
        </Link>
        <Link
          href="/login"
          className="block rounded-lg px-3 py-2 text-center text-sm text-ink-100 hover:text-white"
        >
          Already have an account? Sign in
        </Link>
      </div>
    </>
  );
}
