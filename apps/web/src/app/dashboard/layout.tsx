import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { DashboardSidebar, DashboardMobileBar } from "@/components/dashboard/DashboardNav";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  const email = session.user.email ?? "";

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <DashboardSidebar userEmail={email} signOutAction={handleSignOut} />
      <div className="flex flex-1 flex-col">
        <DashboardMobileBar userEmail={email} signOutAction={handleSignOut} />
        <main className="flex-1 px-6 py-8 md:px-10">{children}</main>
      </div>
    </div>
  );
}
