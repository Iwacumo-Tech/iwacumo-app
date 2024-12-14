import DashboardShell from "@/components/dashboard/dashboard-shell";
import { auth } from "@/auth";
import { notFound } from "next/navigation";
import { SessionProvider } from "next-auth/react";
import { Session } from "next-auth";
import { links } from "./links";

export default async function AppLayout ({ children }: {children: React.ReactNode}) {
  const session = await auth();

  if (!session) notFound();

  return (
    <SessionProvider session={session as Session | null}>
      <DashboardShell links={links}>{children}</DashboardShell>

    </SessionProvider>
  );
}
