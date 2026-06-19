import Link from "next/link";
import { Leaf, Github, Info } from "lucide-react";
import { LoginForm } from "./LoginForm";

// On the showcase deploy, account creation is disabled. The /signup page tells
// users about it; mirroring the notice on /login (U-6) closes the same gap when
// a visitor arrives at the login URL directly — otherwise "Invalid email or
// password" looks like a credentials issue rather than "the demo doesn't have
// accounts".
export default function LoginPage() {
  const disabled = process.env.DISABLE_REGISTRATION === "true";

  return (
    <div className="flex min-h-screen items-center justify-center bg-grid px-6">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2">
          <Leaf className="h-6 w-6 text-leaf-400" />
          <span className="text-xl font-semibold">Netleaf</span>
        </Link>
        <div className="rounded-xl border border-white/10 bg-ink-900/70 p-6">
          <h1 className="text-xl font-semibold">Sign in</h1>
          <p className="mt-1 text-sm text-ink-100">Welcome back.</p>
          {disabled && <ShowcaseModeNotice />}
          <LoginForm />
          <p className="mt-4 text-center text-sm text-ink-100">
            No account?{" "}
            {disabled ? (
              <span className="text-ink-300">
                showcase mode — see notice above
              </span>
            ) : (
              <Link href="/signup" className="text-leaf-400 hover:underline">
                Sign up
              </Link>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

function ShowcaseModeNotice() {
  return (
    <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-amber-100">
      <Info className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="text-sm">
        <p className="font-medium">Showcase mode — no demo accounts</p>
        <p className="mt-1 text-amber-100/80">
          This public deployment doesn't have sign-up enabled. To try the
          dashboard, run Netleaf locally — see{" "}
          <a
            href="https://github.com/Ramcode64/netleaf"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 underline hover:no-underline"
          >
            <Github className="h-3 w-3" /> GitHub
          </a>{" "}
          or the{" "}
          <Link href="/docs" className="underline hover:no-underline">
            docs
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
