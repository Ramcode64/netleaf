import Link from "next/link";
import { redirect } from "next/navigation";
import { Leaf, LayoutDashboard, KeyRound, Network, CalendarClock } from "lucide-react";
import { auth, signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";

const nav = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/api-keys", label: "API Keys", icon: KeyRound },
  { href: "/dashboard/crawls", label: "Crawls", icon: Network },
  { href: "/dashboard/schedules", label: "Schedules", icon: CalendarClock },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 flex-col border-r border-white/10 bg-ink-900/40 p-4 md:flex">
        <Link href="/" className="mb-8 flex items-center gap-2 px-2">
          <Leaf className="h-5 w-5 text-leaf-400" />
          <span className="font-semibold">Netleaf</span>
        </Link>
        <nav className="flex-1 space-y-1">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-ink-100 transition-colors hover:bg-white/5 hover:text-white"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-white/10 pt-4">
          <p className="truncate px-3 text-xs text-ink-100/70">{session.user.email}</p>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <Button variant="ghost" size="sm" className="mt-2 w-full justify-start">
              Sign out
            </Button>
          </form>
        </div>
      </aside>
      <main className="flex-1 px-6 py-8 md:px-10">{children}</main>
    </div>
  );
}
