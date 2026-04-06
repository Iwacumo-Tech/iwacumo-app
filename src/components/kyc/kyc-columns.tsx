"use client";

import { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/table/data-table-column-header";
import { KycReviewModal } from "./kyc-review-modal";

// ── Status badge ──────────────────────────────────────────────
const STATUS_STYLES: Record<string, { label: string; cls: string }> = {
  pending:   { label: "Not Submitted", cls: "bg-gray-100 border-gray-300 text-gray-600"     },
  submitted: { label: "Awaiting Review", cls: "bg-accent border-black text-black"           },
  approved:  { label: "Approved",        cls: "bg-green-100 border-green-400 text-green-700"},
  rejected:  { label: "Rejected",        cls: "bg-red-100 border-red-400 text-red-700"      },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_STYLES[status] ?? STATUS_STYLES.pending;
  return (
    <span className={`inline-flex items-center border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

export const kycColumns: ColumnDef<any>[] = [
  {
    id: "publisher",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Publisher" />,
    cell: ({ row }) => {
      const kyc  = row.original;
      const user = kyc.publisher?.user;
      const org  = kyc.publisher?.tenant?.name ?? "—";
      return (
        <div className="py-1">
          <p className="font-black text-sm">{org}</p>
          <p className="text-[10px] opacity-50">
            {user?.first_name} {user?.last_name} · {user?.email}
          </p>
        </div>
      );
    },
  },
  {
    id: "legal_name",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Legal Name" />,
    cell: ({ row }) => (
      <p className="text-sm font-medium">
        {row.original.legal_name || <span className="opacity-30 italic text-xs">—</span>}
      </p>
    ),
  },
  {
    id: "status",
    accessorKey: "status",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    id: "submitted_at",
    accessorKey: "submitted_at",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Submitted" />,
    cell: ({ row }) => {
      const date = row.original.submitted_at;
      if (!date) return <span className="opacity-30 text-xs italic">—</span>;
      return (
        <p className="text-xs font-bold">
          {new Date(date).toLocaleDateString("en-NG", {
            day: "numeric", month: "short", year: "numeric",
          })}
        </p>
      );
    },
  },
  {
    id: "reviewer",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Reviewer" />,
    cell: ({ row }) => {
      const reviewer = row.original.reviewer;
      if (!reviewer) return <span className="opacity-30 text-xs italic">—</span>;
      return (
        <p className="text-xs font-bold">
          {reviewer.first_name} {reviewer.last_name}
        </p>
      );
    },
  },
  {
    id: "actions",
    enableHiding: false,
    header: () => null,
    cell: ({ row }) => <KycReviewModal kyc={row.original} />,
  },
];