"use client";

import { useSession } from "next-auth/react";
import { trpc }       from "@/app/_providers/trpc-provider";
import { KycForm }    from "@/components/kyc/kyc-form";
import { Loader2, AlertTriangle, ShieldCheck } from "lucide-react";

export default function KycPage() {
  const { data: session, status } = useSession();
  const publisherId = (session?.user as any)?.publisher_id as string | undefined;
  const authorId = (session?.user as any)?.author_id as string | undefined;
  const activeProfile = session?.activeProfile;
  const isAuthorVerification = activeProfile === "author" && !!(session?.user as any)?.author_requires_kyc;
  const isPublisherVerification = activeProfile === "publisher";

  const { data: kyc, isLoading: kycLoading } = trpc.getMyKyc.useQuery(
    { publisher_id: publisherId! },
    { enabled: !!publisherId && isPublisherVerification }
  );
  const { data: authorKyc, isLoading: authorKycLoading } = trpc.getMyAuthorKyc.useQuery(
    { author_id: authorId! },
    { enabled: !!authorId && isAuthorVerification }
  );

  const { data: requirements, isLoading: reqLoading } =
    trpc.getKycRequirements.useQuery(undefined, { enabled: isPublisherVerification });
  const { data: authorRequirements, isLoading: authorReqLoading } =
    trpc.getAuthorKycRequirements.useQuery(undefined, { enabled: isAuthorVerification });

  const isLoading = status === "loading" || kycLoading || reqLoading || authorKycLoading || authorReqLoading;

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center gap-3 text-sm font-bold uppercase tracking-widest opacity-40">
        <Loader2 className="animate-spin size-5" />
        Loading...
      </div>
    );
  }

  // Guard — publisher_id missing from session means auth.ts didn't
  // resolve the publisher relation. Show a clear error rather than
  // a broken form that silently fails on submit.
  if (isPublisherVerification && !publisherId) {
    return (
      <div className="max-w-lg mx-auto py-12 space-y-6">
        <div className="flex items-start gap-3 border-4 border-black bg-red-50 p-6">
          <AlertTriangle className="size-6 shrink-0 mt-0.5 text-red-600" />
          <div>
            <p className="font-black uppercase tracking-widest text-red-700 text-sm">
              Publisher Profile Not Found
            </p>
            <p className="text-sm text-red-600 mt-2">
              Your account isn&apos;t linked to a publisher profile. This can happen if
              your account was created before the publisher record was set up.
            </p>
            <p className="text-sm text-red-600 mt-2">
              Please sign out and sign back in. If the issue persists, contact support.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isAuthorVerification && !authorId) {
    return (
      <div className="max-w-lg mx-auto py-12 space-y-6">
        <div className="flex items-start gap-3 border-4 border-black bg-red-50 p-6">
          <AlertTriangle className="size-6 shrink-0 mt-0.5 text-red-600" />
          <div>
            <p className="font-black uppercase tracking-widest text-red-700 text-sm">
              Author Profile Not Found
            </p>
            <p className="text-sm text-red-600 mt-2">
              Your account is not linked to a white-label author profile yet.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const resolvedKyc = isAuthorVerification ? authorKyc : kyc;
  const resolvedRequirements = isAuthorVerification ? authorRequirements : requirements;
  const isRejected = resolvedKyc?.status === "rejected";
  const needsResubmission = !!resolvedKyc?.needs_resubmission;
  const title = isAuthorVerification ? "Author Verification" : "Publisher Verification";
  const subtitle = isAuthorVerification
    ? "Complete verification to activate your white-label author account"
    : "Complete KYC to activate your publisher account";
  const whyText = isAuthorVerification
    ? "Verification protects readers, publishers, and the platform. Your documents are reviewed manually by our team before your author tools are fully activated."
    : "KYC verification protects the platform and your customers. Your documents are reviewed manually by our team and stored securely. Once approved, you&apos;ll have full access to publish, sell, and receive payouts.";

  return (
    <div className="max-w-2xl mx-auto space-y-10">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="border-b-4 border-black pb-8">
        <h1 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter">
          {title}<span className="text-accent">.</span>
        </h1>
        <p className="font-bold text-xs uppercase opacity-40 tracking-widest mt-2">
          {subtitle}
        </p>
      </div>

      {/* ── Rejection notice ────────────────────────────────── */}
      {isRejected && (
        <div className="flex items-start gap-3 border-2 border-black bg-red-50 p-5">
          <AlertTriangle className="size-5 shrink-0 mt-0.5 text-red-600" />
          <div>
            <p className="font-black uppercase text-[11px] tracking-widest text-red-700">
              Previous Submission Rejected
            </p>
            <p className="text-sm text-red-600 mt-1">
              {resolvedKyc?.reviewer_notes
                ? resolvedKyc.reviewer_notes
                : "Your documents were not accepted. Please review and resubmit."}
            </p>
          </div>
        </div>
      )}

      {needsResubmission && (
        <div className="flex items-start gap-3 border-2 border-black bg-[#f9f6f0] p-5">
          <AlertTriangle className="size-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-black uppercase text-[11px] tracking-widest">
              Requirements Updated
            </p>
            <p className="text-sm mt-1">
              Your earlier verification was approved, but a newly required document is now missing.
              Add the missing document below and resubmit so your access stays active.
            </p>
          </div>
        </div>
      )}

      {/* ── Info banner ─────────────────────────────────────── */}
      <div className="flex items-start gap-3 border-2 border-black bg-accent p-5">
        <ShieldCheck className="size-5 shrink-0 mt-0.5" />
        <div>
          <p className="font-black uppercase text-[11px] tracking-widest">
            Why do we need this?
          </p>
          <p className="text-sm mt-1">
            {whyText}
          </p>
        </div>
      </div>

      {/* ── Form ─────────────────────────────────────────────── */}
      {resolvedRequirements && (
        <KycForm
          mode={isAuthorVerification ? "author" : "publisher"}
          publisherId={publisherId}
          authorId={authorId}
          existingKyc={resolvedKyc}
          requirements={resolvedRequirements}
        />
      )}
    </div>
  );
}
