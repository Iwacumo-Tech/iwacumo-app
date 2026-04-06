"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { trpc } from "@/app/_providers/trpc-provider";
import { Loader2 } from "lucide-react";
 
// Roles that bypass KYC entirely
const STAFF_ROLES = new Set([
  "super-admin", "staff-basic", "staff-content",
  "staff-publisher", "staff-finance", "tenant-admin",
]);
 
// Paths that are always accessible — never redirect from these
const KYC_PATHS = ["/app/kyc", "/app/kyc/pending"];
 
interface KycGateProps {
  children: React.ReactNode;
}
 
export function KycGate({ children }: KycGateProps) {
  const { data: session, status: sessionStatus } = useSession();
  const router   = useRouter();
  const pathname = usePathname();
 
  const userRoles  = (session?.roles ?? []).map((r: any) => r.name?.toLowerCase());
  const isPublisher  = userRoles.includes("publisher");
  const isStaffOrAdmin = userRoles.some((r: string) => STAFF_ROLES.has(r));
  const needsGate  = isPublisher && !isStaffOrAdmin;
  const publisherId = (session?.user as any)?.publisher_id as string | undefined;
 
  // Only fetch KYC if this user actually needs gating
  const { data: kyc, isLoading: kycLoading } = trpc.getMyKyc.useQuery(
    { publisher_id: publisherId! },
    {
      enabled: needsGate && !!publisherId && sessionStatus === "authenticated",
      // Don't refetch on window focus — status doesn't change mid-session
      refetchOnWindowFocus: false,
    }
  );
 
  const { data: requirements, isLoading: reqLoading } =
    trpc.getKycRequirements.useQuery(undefined, {
      enabled: needsGate && sessionStatus === "authenticated",
      refetchOnWindowFocus: false,
    });
 
  useEffect(() => {
    // Don't redirect while session or data is still loading
    if (sessionStatus !== "authenticated") return;
    if (!needsGate) return;
    if (kycLoading || reqLoading) return;
 
    // Already on a KYC page — don't redirect
    const isOnKycPath = KYC_PATHS.some(p => pathname.startsWith(p));
    if (isOnKycPath) return;
 
    const status = kyc?.status;
 
    // Check if required docs are uploaded
    const req = requirements ?? {
      require_id: true,
      require_business_reg: true,
      require_proof_of_address: true,
    };
 
    const idMet      = !req.require_id               || !!kyc?.id_document_url;
    const regMet     = !req.require_business_reg     || !!kyc?.business_reg_url;
    const addressMet = !req.require_proof_of_address || !!kyc?.proof_of_address_url;
    const docsMet    = idMet && regMet && addressMet;
 
    if (!status || status === "pending" || status === "rejected" || !docsMet) {
      router.replace("/app/kyc");
      return;
    }
 
    if (status === "submitted") {
      router.replace("/app/kyc/pending");
    }
 
    // status === "approved" → fall through, render children
  }, [sessionStatus, needsGate, kycLoading, reqLoading, kyc, requirements, pathname]);
 
  // ── Loading state — only shown to publishers while checking ──
  const isChecking =
    needsGate &&
    (sessionStatus === "loading" || kycLoading || reqLoading) &&
    !KYC_PATHS.some(p => pathname.startsWith(p));
 
  if (isChecking) {
    return (
      <div className="flex h-[60vh] items-center justify-center gap-3">
        <Loader2 className="animate-spin size-5 opacity-30" />
        <span className="text-xs font-black uppercase tracking-widest opacity-30">
          Verifying access...
        </span>
      </div>
    );
  }
 
  return <>{children}</>;
}