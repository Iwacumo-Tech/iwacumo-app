"use client";

import { useSession } from "next-auth/react";
import { trpc }       from "@/app/_providers/trpc-provider";
import { KycForm }    from "@/components/kyc/kyc-form";
import { Loader2, AlertTriangle, ShieldCheck } from "lucide-react";

export default function KycPage() {
  const { data: session, status } = useSession();
  console.log(session?.user?.publisher_id)
  // publisher_id comes from auth.ts session callback
  // It maps to Publisher.id (not User.id)
  const publisherId = (session?.user as any)?.publisher_id as string | undefined;

  const { data: kyc, isLoading: kycLoading } = trpc.getMyKyc.useQuery(
    { publisher_id: publisherId! },
    { enabled: !!publisherId }
  );

  const { data: requirements, isLoading: reqLoading } =
    trpc.getKycRequirements.useQuery();

  const isLoading = status === "loading" || kycLoading || reqLoading;

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
  if (!publisherId) {
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

  const isRejected = kyc?.status === "rejected";

  return (
    <div className="max-w-2xl mx-auto space-y-10">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="border-b-4 border-black pb-8">
        <h1 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter">
          Publisher Verification<span className="text-accent">.</span>
        </h1>
        <p className="font-bold text-xs uppercase opacity-40 tracking-widest mt-2">
          Complete KYC to activate your publisher account
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
              {kyc?.reviewer_notes
                ? kyc.reviewer_notes
                : "Your documents were not accepted. Please review and resubmit."}
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
            KYC verification protects the platform and your customers. Your documents
            are reviewed manually by our team and stored securely. Once approved,
            you&apos;ll have full access to publish, sell, and receive payouts.
          </p>
        </div>
      </div>

      {/* ── Form ─────────────────────────────────────────────── */}
      {requirements && (
        <KycForm
          publisherId={publisherId}
          existingKyc={kyc}
          requirements={requirements}
        />
      )}
    </div>
  );
}