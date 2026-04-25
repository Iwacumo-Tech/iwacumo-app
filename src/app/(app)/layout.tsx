import DashboardShell from "@/components/dashboard/dashboard-shell";
import { auth } from "@/auth";
import { SessionProvider } from "next-auth/react";
import { Session } from "next-auth";
import { links } from "./links";
import { redirect } from "next/navigation";
import { getRolesForActiveProfile } from "@/lib/profile-mode";
import { TawkChat } from "@/components/shared/tawk-chat";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) {
    redirect("/login?callbackUrl=/app");
  }

  const availableProfiles = session.availableProfiles ?? [];
  const activeProfile = session.activeProfile ?? null;
  const userRoles = getRolesForActiveProfile(
    activeProfile,
    session.roles?.map((r) => r.name.toLowerCase()) || []
  );

  // Sidebar link filtering — same logic as before
  const filteredLinks = links.filter((link) => {
    if (!link.requiredPermission) return true;
    const allowedRoles = link.requiredPermission
      .split(",")
      .map(r => r.trim().toLowerCase());
    return userRoles.some(role => allowedRoles.includes(role));
  });

  const hydratedSession = {
    ...session,
    availableProfiles,
    activeProfile,
  };

  return (
    <SessionProvider
      key={`${activeProfile ?? "none"}:${availableProfiles.join(",")}`}
      session={hydratedSession as Session | null}
    >
      <TawkChat />
      <DashboardShell links={filteredLinks}>
        {children}
      </DashboardShell>
    </SessionProvider>
  );
}
