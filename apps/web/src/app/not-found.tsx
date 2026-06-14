import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-6xl font-bold text-leaf-400">404</h1>
      <p className="text-xl text-ink-100">Page not found</p>
      <Link href="/" className="text-leaf-400 hover:underline">
        Return home →
      </Link>
    </div>
  );
}
