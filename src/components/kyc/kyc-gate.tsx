"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { trpc } from "@/app/_providers/trpc-provider";
import {
  Loader2, ShieldCheck, Clock, AlertTriangle, ArrowRight, Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut } from "next-auth/react";

// Roles that bypass KYC entirely
const STAFF_ROLES = new Set([
  "super-admin", "staff-basic", "staff-content",
  "staff-publisher", "staff-finance", "tenant-admin",
]);

// KYC pages themselves are always accessible without the gate
const KYC_PATHS = ["/app/kyc", "/app/kyc/pending"];

interface KycGateProps {
  children: React.ReactNode;
}

// ── Status config ─────────────────────────────────────────────
type KycStatus = "pending" | "submitted" | "rejected" | "approved" | "none";

interface StatusConfig {
  icon:       React.ReactNode;
  title:      string;
  body:       string;
  accent:     string;  // bg class for the icon container
  cta?:       { label: string; action: "go_kyc" | "sign_out" };
  secondary?: { label: string; action: "sign_out" };
}

function getStatusConfig(status: KycStatus, orgName?: string): StatusConfig {
  const org = orgName ?? "your organisation";

  switch (status) {
    case "none":
    case "pending":
      return {
        icon:    <ShieldCheck className="size-10" />,
        title:   "Complete Your Verification",
        body:    `Before you can publish and sell on the platform, ${org} needs to complete KYC verification. It only takes a few minutes.`,
        accent:  "bg-accent",
        cta:     { label: "Start Verification", action: "go_kyc" },
        secondary: { label: "Sign Out", action: "sign_out" },
      };

    case "rejected":
      return {
        icon:    <AlertTriangle className="size-10" />,
        title:   "Verification Needs Attention",
        body:    `Your KYC submission for ${org} was not approved. Please review the feedback and resubmit your documents.`,
        accent:  "bg-red-100",
        cta:     { label: "Resubmit Documents", action: "go_kyc" },
        secondary: { label: "Sign Out", action: "sign_out" },
      };

    case "submitted":
      return {
        icon:    <Clock className="size-10" />,
        title:   "Verification In Review",
        body:    `Your KYC documents for ${org} have been submitted and are being reviewed by our team. This usually takes 1–2 business days. You'll receive an email once approved.`,
        accent:  "bg-accent",
        cta:     undefined, // no action needed — just waiting
        secondary: { label: "Sign Out", action: "sign_out" },
      };

    default:
      return {
        icon:    <ShieldCheck className="size-10" />,
        title:   "Verification Required",
        body:    "Please complete KYC verification to access the platform.",
        accent:  "bg-accent",
        cta:     { label: "Start Verification", action: "go_kyc" },
      };
  }
}

// ── Overlay modal ─────────────────────────────────────────────
function KycOverlay({
  status,
  orgName,
  reviewerNotes,
  requirementsUpdated,
}: {
  status:        KycStatus;
  orgName?:      string;
  reviewerNotes?: string | null;
  requirementsUpdated?: boolean;
}) {
  const router = useRouter();
  const cfg    = getStatusConfig(status, orgName);
  const body = requirementsUpdated
    ? `Your verification for ${orgName ?? "your organisation"} needs one more document because the KYC requirements were updated. Please review the form and resubmit to continue.`
    : cfg.body;

  const handleAction = (action: "go_kyc" | "sign_out") => {
    if (action === "go_kyc")   router.push("/app/kyc");
    if (action === "sign_out") signOut({ callbackUrl: "/login" });
  };

  return (
    // Full-screen overlay — backdrop-blur keeps dashboard visible but inaccessible
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white border-4 border-black gumroad-shadow space-y-6 p-8 animate-in fade-in slide-in-from-bottom-4">

        {/* Icon */}
        <div className={`w-20 h-20 ${cfg.accent} border-4 border-black flex items-center justify-center mx-auto`}>
          {cfg.icon}
        </div>

        {/* Text */}
        <div className="text-center space-y-3">
          <h2 className="text-2xl font-black uppercase italic tracking-tighter">
            {cfg.title}<span className="text-accent">.</span>
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {body}
          </p>

          {requirementsUpdated && (
            <div className="border-2 border-black bg-[#f9f6f0] p-4 text-left mt-2">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-50">
                Requirements Updated
              </p>
              <p className="text-sm font-bold mt-1">
                Your earlier approval stays on record, but you need to add the newly required document before access can continue.
              </p>
            </div>
          )}

          {/* Rejection notes from reviewer */}
          {status === "rejected" && reviewerNotes && (
            <div className="border-2 border-black bg-red-50 p-4 text-left space-y-1 mt-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-red-700">
                Reviewer Feedback
              </p>
              <p className="text-sm text-red-600 font-bold leading-relaxed">
                {reviewerNotes}
              </p>
            </div>
          )}

          {/* Submitted state — extra reassurance */}
          {status === "submitted" && (
            <div className="flex items-center gap-2 justify-center border-2 border-black bg-accent p-3 mt-2">
              <Mail className="size-4 shrink-0" />
              <p className="text-[11px] font-black uppercase tracking-widest">
                Check your inbox for updates
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          {cfg.cta && (
            <Button
              onClick={() => handleAction(cfg.cta!.action)}
              className="w-full booka-button-primary h-14 text-base flex items-center justify-center gap-2"
            >
              {cfg.cta.label}
              <ArrowRight className="size-4" />
            </Button>
          )}
          {cfg.secondary && (
            <Button
              variant="outline"
              onClick={() => handleAction(cfg.secondary!.action)}
              className="w-full booka-button-secondary h-12"
            >
              {cfg.secondary.label}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Gate component ────────────────────────────────────────────
export function KycGate({ children }: KycGateProps) {
  const { data: session, status: sessionStatus } = useSession();
  const pathname = usePathname();

  const userRoles      = (session?.roles ?? []).map((r: any) => r.name?.toLowerCase());
  const activeProfile  = session?.activeProfile;
  const isPublisher    = activeProfile === "publisher";
  const isAuthor       = activeProfile === "author";
  const isStaffOrAdmin = userRoles.some((r: string) => STAFF_ROLES.has(r));
  const needsPublisherGate = isPublisher && !isStaffOrAdmin;
  const needsAuthorGate = isAuthor && !!(session?.user as any)?.author_requires_kyc;
  const needsGate      = needsPublisherGate || needsAuthorGate;
  const publisherId    = (session?.user as any)?.publisher_id as string | undefined;
  const authorId       = (session?.user as any)?.author_id as string | undefined;

  // Resolve org name for personalised messaging
  const orgName = (session as any)?.tenantSlug ?? undefined;

  const { data: kyc, isLoading: kycLoading } = trpc.getMyKyc.useQuery(
    { publisher_id: publisherId! },
    {
      enabled:              needsPublisherGate && !!publisherId && sessionStatus === "authenticated",
      refetchOnWindowFocus: false,
    }
  );
  const { data: authorKyc, isLoading: authorKycLoading } = trpc.getMyAuthorKyc.useQuery(
    { author_id: authorId! },
    {
      enabled: needsAuthorGate && !!authorId && sessionStatus === "authenticated",
      refetchOnWindowFocus: false,
    }
  );

  const { data: requirements, isLoading: reqLoading } =
    trpc.getKycRequirements.useQuery(undefined, {
      enabled:              needsPublisherGate && sessionStatus === "authenticated",
      refetchOnWindowFocus: false,
    });

  const { data: authorRequirements, isLoading: authorReqLoading } =
    trpc.getAuthorKycRequirements.useQuery(undefined, {
      enabled: needsAuthorGate && sessionStatus === "authenticated",
      refetchOnWindowFocus: false,
    });

  // ── Determine KYC status ──────────────────────────────────
  const isOnKycPath = KYC_PATHS.some(p => pathname.startsWith(p));
  const isChecking  =
    needsGate &&
    (kycLoading || reqLoading || authorKycLoading || authorReqLoading) &&
    sessionStatus === "authenticated";
  const currentKyc = needsAuthorGate ? authorKyc : kyc;
  const currentRequirements = needsAuthorGate ? authorRequirements : requirements;
  const requirementsUpdated = !!currentKyc?.needs_resubmission;

  let kycStatus: KycStatus = "none";

  if (needsGate && !isChecking && currentKyc) {
    if (currentKyc.needs_resubmission || currentKyc.status === "pending") kycStatus = "pending";
    else kycStatus = currentKyc.status as KycStatus;
  }

  const showOverlay =
    needsGate &&
    !isOnKycPath &&         // KYC pages themselves are never blocked
    !isChecking &&          // Don't show overlay while still loading
    sessionStatus === "authenticated" &&
    kycStatus !== "approved" &&
    kycStatus !== "none";   // "none" = no record yet → also show overlay

  // "none" case — show overlay when we know the user has no KYC record
  const showOverlayNone =
    needsGate &&
    !isOnKycPath &&
    !isChecking &&
    !kycLoading &&
    sessionStatus === "authenticated" &&
    !currentKyc; // no record at all

  return (
    <>
      {/* Always render children so dashboard is visible behind overlay */}
      {children}

      {/* Loading indicator — subtle, only for publishers */}
      {isChecking && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-white border-2 border-black px-4 py-2 gumroad-shadow-sm">
          <Loader2 className="animate-spin size-4" />
          <span className="text-[10px] font-black uppercase tracking-widest">
            Checking verification...
          </span>
        </div>
      )}

      {/* KYC overlay — blocks interaction, keeps dashboard blurred behind */}
      {(showOverlay || showOverlayNone) && (
        <KycOverlay
          status={showOverlayNone ? "none" : kycStatus}
          orgName={orgName}
          reviewerNotes={currentKyc?.reviewer_notes}
          requirementsUpdated={requirementsUpdated}
        />
      )}
    </>
  );
}
