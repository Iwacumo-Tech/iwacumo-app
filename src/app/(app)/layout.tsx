import DashboardShell from "@/components/dashboard/dashboard-shell";
import { auth } from "@/auth";
import { notFound } from "next/navigation";
import { SessionProvider } from "next-auth/react";
import { Session } from "next-auth";
import { links } from "./links";

/**
 * App Layout (Server Component)
 * Handles session provision and secure navigation filtering.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session) notFound();

  // Extract user roles from session (NextAuth custom session)
  const userRoles = session.roles?.map(r => r.name.toLowerCase()) || [];

  // Filter links based on user roles
  const filteredLinks = links.filter((link) => {
    if (!link.requiredPermission) return true;
    
    const allowedRoles = link.requiredPermission.split(",").map(r => r.trim().toLowerCase());
    
    // Check if any of the user's roles match the allowed roles for this link
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