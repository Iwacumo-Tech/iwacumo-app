"use client";

import { trpc }       from "@/app/_providers/trpc-provider";
import { DataTable }  from "@/components/table/data-table";
import { kycColumns } from "@/components/kyc/kyc-columns";
import { Loader2, ShieldCheck, Clock, CheckCircle2, XCircle } from "lucide-react";

export default function KycReviewsPage() {
  const { data: submissions, isLoading } = trpc.getAllKycSubmissions.useQuery();

  const total     = submissions?.length ?? 0;
  const pending   = submissions?.filter(k => k.status === "submitted").length ?? 0;
  const approved  = submissions?.filter(k => k.status === "approved").length  ?? 0;
  const rejected  = submissions?.filter(k => k.status === "rejected").length  ?? 0;

  return (
    <div className="space-y-10">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b-4 border-black pb-8">
        <div>
          <h1 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter">
            KYC Reviews<span className="text-accent">.</span>
          </h1>
          <p className="font-bold text-xs uppercase opacity-40 tracking-widest mt-2">
            Publisher verification submissions
          </p>
        </div>
      </div>

      {/* ── Stat cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total",    value: total,    Icon: ShieldCheck,  cls: "" },
          { label: "Pending",  value: pending,  Icon: Clock,        cls: pending > 0 ? "bg-accent" : "" },
          { label: "Approved", value: approved, Icon: CheckCircle2, cls: "" },
          { label: "Rejected", value: rejected, Icon: XCircle,      cls: "" },
        ].map(({ label, value, Icon, cls }) => (
          <div key={label} className={`booka-stat-card flex items-center gap-4 ${cls}`}>
            <div className="w-10 h-10 border-2 border-black flex items-center justify-center shrink-0">
              <Icon className="size-5" />
            </div>
            <div>
              <p className="text-2xl font-black">{value}</p>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-50">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Pending attention banner ─────────────────────────── */}
      {pending > 0 && (
        <div className="flex items-start gap-3 border-2 border-black bg-accent p-4">
          <Clock className="size-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-black uppercase text-[11px] tracking-widest">
              {pending} submission{pending > 1 ? "s" : ""} awaiting review
            </p>
            <p className="text-sm mt-1">
              Publishers are blocked from the platform until their KYC is reviewed.
              Please action these promptly.
            </p>
          </div>
        </div>
      )}

      {/* ── Table ──────────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex items-center gap-3 p-8 text-sm font-bold uppercase tracking-widest opacity-40">
          <Loader2 size={16} className="animate-spin" />
          Loading submissions...
        </div>
      ) : (
        <div className="bg-white border-4 border-black gumroad-shadow overflow-hidden">
          <DataTable
            columns={kycColumns as any}
            data={submissions ?? []}
            filterInputPlaceholder="Search by status..."
            filterColumnId="status"
          />
        </div>
      )}
    </div>
  );
}