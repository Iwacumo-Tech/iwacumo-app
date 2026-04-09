import DashboardShell from "@/components/dashboard/dashboard-shell";
import { auth }       from "@/auth";
import { notFound }   from "next/navigation";
import { SessionProvider } from "next-auth/react";
import { Session }    from "next-auth";
import { links }      from "./links";
import { redirect } from "next/navigation";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) {
    redirect("/login?callbackUrl=/app");
  }

  const userRoles = session.roles?.map(r => r.name.toLowerCase()) || [];

  // Sidebar link filtering — same logic as before
  const filteredLinks = links.filter((link) => {
    if (!link.requiredPermission) return true;
    const allowedRoles = link.requiredPermission
      .split(",")
      .map(r => r.trim().toLowerCase());
    return userRoles.some(role => allowedRoles.includes(role));
  });

  return (
    <SessionProvider session={session as Session | null}>
      <DashboardShell links={filteredLinks}>
        {children}
      </DashboardShell>
    </SessionProvider>
  );
}