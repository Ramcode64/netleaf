"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      setError("Invalid email or password");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

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
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <Field
              label="Email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={setEmail}
              required
            />
            <Field
              label="Password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={setPassword}
              required
            />
            {error && <p className="text-sm text-red-400">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-ink-100">
            No account?{" "}
            <Link href="/signup" className="text-leaf-400 hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  type,
  autoComplete,
  value,
  onChange,
  required,
}: {
  label: string;
  name: string;
  type: string;
  autoComplete?: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm text-ink-100">{label}</span>
      <input
        type={type}
        name={name}
        autoComplete={autoComplete}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-white/10 bg-ink-950 px-3 py-2 text-sm text-white outline-none focus:border-leaf-500/60"
      />
    </label>
  );
}
