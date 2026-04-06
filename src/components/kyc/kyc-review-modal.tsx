"use client";

import { useState } from "react";
import { trpc }     from "@/app/_providers/trpc-provider";
import { useToast } from "@/components/ui/use-toast";
import { useSession } from "next-auth/react";
import { Button }   from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  CheckCircle2, XCircle, ExternalLink, FileText,
  User, Building2, MapPin, Phone, CreditCard,
} from "lucide-react";
import Image from "next/image";

interface KycReviewModalProps {
  kyc: any;
}

function DocLink({ url, label }: { url: string | null; label: string }) {
  if (!url) return (
    <span className="text-[10px] font-bold uppercase opacity-30 italic">Not provided</span>
  );
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase underline underline-offset-2 hover:text-accent transition-colors">
      <FileText className="size-3" />
      {label}
      <ExternalLink className="size-3 opacity-50" />
    </a>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-[9px] font-black uppercase tracking-widest opacity-40">{label}</p>
      <p className="font-bold text-sm mt-0.5">{value || <span className="opacity-30 italic">—</span>}</p>
    </div>
  );
}

export function KycReviewModal({ kyc }: KycReviewModalProps) {
  const { data: session } = useSession();
  const { toast }         = useToast();
  const utils             = trpc.useUtils();
  const [open, setOpen]   = useState(false);
  const [notes, setNotes] = useState(kyc.reviewer_notes ?? "");

  const reviewMutation = trpc.reviewKyc.useMutation({
    onSuccess: (_, vars) => {
      toast({
        title: vars.decision === "approved" ? "KYC Approved" : "KYC Rejected",
        description: `Publisher has been notified by email.`,
      });
      utils.getAllKycSubmissions.invalidate();
      setOpen(false);
    },
    onError: (err) =>
      toast({ variant: "destructive", title: "Review Failed", description: err.message }),
  });

  const handleDecision = (decision: "approved" | "rejected") => {
    if (decision === "rejected" && !notes.trim()) {
      toast({ variant: "destructive", title: "Notes required", description: "Please provide rejection feedback for the publisher." });
      return;
    }
    reviewMutation.mutate({
      kyc_id:         kyc.id,
      reviewer_id:    session?.user?.id!,
      decision,
      reviewer_notes: notes.trim() || undefined,
    });
  };

  const pub        = kyc.publisher;
  const user       = pub?.user;
  const org        = pub?.tenant?.name ?? "Unknown Org";
  const isReviewed = kyc.status === "approved" || kyc.status === "rejected";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="booka-button-secondary gap-1.5 h-9 text-[10px]">
          Review
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto border-4 border-black rounded-none gumroad-shadow">
        <DialogHeader>
          <DialogTitle className="font-black uppercase italic tracking-tighter text-xl">
            KYC Review — {org}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-2">

          {/* ── Publisher identity ───────────────────────────── */}
          <div className="bg-white border-2 border-black p-5 space-y-4">
            <h4 className="font-black uppercase text-[10px] tracking-widest border-b border-black/10 pb-2 flex items-center gap-2">
              <User className="size-3" /> Publisher Identity
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <InfoRow label="Account Name"  value={`${user?.first_name ?? ""} ${user?.last_name ?? ""}`} />
              <InfoRow label="Account Email" value={user?.email} />
              <InfoRow label="Legal Name"    value={kyc.legal_name} />
              <InfoRow label="Phone"         value={kyc.phone_number} />
            </div>
            <div className="pt-2">
              <p className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-2">ID Document</p>
              <div className="flex items-center gap-4">
                <span className="inline-block border border-black px-2 py-0.5 text-[10px] font-black uppercase tracking-wide">
                  {kyc.id_document_type?.replace(/_/g, " ") ?? "—"}
                </span>
                <DocLink url={kyc.id_document_url} label="View ID" />
              </div>
            </div>
          </div>

          {/* ── Business registration ────────────────────────── */}
          <div className="bg-white border-2 border-black p-5 space-y-4">
            <h4 className="font-black uppercase text-[10px] tracking-widest border-b border-black/10 pb-2 flex items-center gap-2">
              <Building2 className="size-3" /> Business Registration
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <InfoRow label="Business Name"    value={kyc.business_name} />
              <InfoRow label="Business Address" value={kyc.business_address} />
            </div>
            <div className="pt-1">
              <p className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-2">Certificate</p>
              <DocLink url={kyc.business_reg_url} label="View Business Reg" />
            </div>
          </div>

          {/* ── Proof of address ─────────────────────────────── */}
          <div className="bg-white border-2 border-black p-5 space-y-3">
            <h4 className="font-black uppercase text-[10px] tracking-widest border-b border-black/10 pb-2 flex items-center gap-2">
              <MapPin className="size-3" /> Proof of Address
            </h4>
            <DocLink url={kyc.proof_of_address_url} label="View Proof of Address" />
          </div>

          {/* ── Reviewer notes ────────────────────────────────── */}
          <div className="space-y-2">
            <label className="font-black uppercase text-[10px] tracking-widest">
              Reviewer Notes
              {!isReviewed && (
                <span className="ml-2 font-normal normal-case opacity-40">
                  (required if rejecting)
                </span>
              )}
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isReviewed || reviewMutation.isPending}
              placeholder="Explain what's wrong or missing, or add any approval notes..."
              className="booka-input-minimal min-h-[100px] resize-none"
            />
          </div>

          {/* ── Actions ──────────────────────────────────────── */}
          {isReviewed ? (
            <div className={`flex items-center gap-2 border-2 border-black p-4 ${kyc.status === "approved" ? "bg-accent" : "bg-red-50"}`}>
              {kyc.status === "approved"
                ? <CheckCircle2 className="size-5 shrink-0" />
                : <XCircle className="size-5 shrink-0 text-red-600" />}
              <p className="font-black uppercase text-[11px] tracking-widest">
                {kyc.status === "approved" ? "Already Approved" : "Already Rejected"}
                {kyc.reviewed_at && ` — ${new Date(kyc.reviewed_at).toLocaleDateString()}`}
              </p>
            </div>
          ) : (
            <div className="flex gap-3">
              <Button
                className="flex-1 h-14 border-4 border-black bg-white text-black font-black uppercase italic hover:bg-red-50 flex items-center justify-center gap-2"
                disabled={reviewMutation.isPending}
                onClick={() => handleDecision("rejected")}
              >
                <XCircle className="size-4" />
                Reject
              </Button>
              <Button
                className="flex-1 h-14 booka-button-primary flex items-center justify-center gap-2"
                disabled={reviewMutation.isPending}
                onClick={() => handleDecision("approved")}
              >
                <CheckCircle2 className="size-4" />
                {reviewMutation.isPending ? "Processing..." : "Approve"}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}