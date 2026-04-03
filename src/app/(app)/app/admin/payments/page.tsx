"use client";


import { useState } from "react";
import { trpc } from "@/app/_providers/trpc-provider";
import { useSession } from "next-auth/react";
import {
  DollarSign, BookOpen, TrendingUp, Loader2,
  ChevronLeft, ChevronRight, Building2, BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { keepPreviousData } from "@tanstack/react-query";

// ─── Sub-components (module level) ───────────────────────────────────────────

function StatCard({
  title, value, sub, icon: Icon, accent = false,
}: {
  title: string; value: string; sub?: string;
  icon: React.ElementType; accent?: boolean;
}) {
  return (
    <div className={cn(
      "border-4 border-black p-6 gumroad-shadow transition-transform hover:-translate-y-0.5",
      accent ? "bg-accent" : "bg-white"
    )}>
      <div className="flex justify-between items-start mb-4">
        <Icon className="w-7 h-7 text-black" />
        <span className="text-[9px] font-black uppercase tracking-widest opacity-40">{title}</span>
      </div>
      <div className="text-3xl font-black italic tracking-tighter truncate">{value}</div>
      {sub && <p className="text-[10px] font-medium text-black/50 mt-1">{sub}</p>}
    </div>
  );
}

function PublisherRow({
  pub,
}: {
  pub: {
    publisher_id: string; name: string;
    total_sales: number; publisher_earnings: number;
    platform_fee: number; units_sold: number;
  };
}) {
  return (
    <div className="flex items-center gap-4 px-5 py-4 border-b-[1.5px] border-black/10 last:border-0 hover:bg-black/[0.02]">
      <div className="w-8 h-8 bg-black flex items-center justify-center text-accent text-[10px] font-black shrink-0">
        {pub.name.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-black uppercase italic text-sm truncate">{pub.name}</p>
        <p className="text-[10px] font-medium text-gray-400">{pub.units_sold} units sold</p>
      </div>
      <div className="hidden sm:grid grid-cols-3 gap-6 text-right text-sm">
        <div>
          <p className="font-black italic">₦{pub.total_sales.toLocaleString()}</p>
          <p className="text-[9px] text-gray-400">GMV</p>
        </div>
        <div>
          <p className="font-black italic">₦{pub.publisher_earnings.toLocaleString()}</p>
          <p className="text-[9px] text-gray-400">Publisher</p>
        </div>
        <div>
          <p className="font-black italic text-accent">₦{pub.platform_fee.toLocaleString()}</p>
          <p className="text-[9px] text-gray-400">Platform</p>
        </div>
      </div>
      {/* Mobile fallback */}
      <div className="sm:hidden text-right">
        <p className="font-black italic">₦{pub.platform_fee.toLocaleString()}</p>
        <p className="text-[9px] text-gray-400">Platform fee</p>
      </div>
    </div>
  );
}

function AdminTransactionRow({
  item,
}: {
  item: {
    id: string; order_number: string; order_date: string;
    customer_name: string; book_title: string; format: string;
    total_price: number; platform_fee: number;
    publisher_earnings: number; author_earnings: number;
    author_name: string;
  };
}) {
  const date = new Date(item.order_date).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
  return (
    <div className="grid grid-cols-[1fr_auto] gap-4 items-center px-5 py-4 border-b-[1.5px] border-black/10 last:border-0 hover:bg-black/[0.02] text-sm">
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-black uppercase italic truncate">{item.book_title}</p>
          <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 border border-black/20 text-gray-400">
            {item.format}
          </span>
        </div>
        <p className="text-[10px] font-medium text-gray-400 mt-0.5">
          {item.customer_name} · {item.author_name} · {date} · {item.order_number}
        </p>
      </div>
      <div className="text-right shrink-0 space-y-0.5">
        <p className="font-black text-base italic">₦{item.total_price.toLocaleString()}</p>
        <p className="text-[9px] text-accent font-black">Platform: ₦{item.platform_fee.toLocaleString()}</p>
      </div>
    </div>
  );
}

function Pagination({
  page, totalPages, onPrev, onNext,
}: { page: number; totalPages: number; onPrev: () => void; onNext: () => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-5 py-4 border-t-[1.5px] border-black/10">
      <button onClick={onPrev} disabled={page <= 1} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest disabled:opacity-30 hover:text-accent transition-colors">
        <ChevronLeft size={14} /> Prev
      </button>
      <span className="text-[10px] font-black uppercase tracking-widest opacity-50">
        Page {page} of {totalPages}
      </span>
      <button onClick={onNext} disabled={page >= totalPages} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest disabled:opacity-30 hover:text-accent transition-colors">
        Next <ChevronRight size={14} />
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminPaymentsPage() {
  const { data: session } = useSession();
  const [page, setPage] = useState(1);

  const isSuperAdmin = session?.roles?.some(r => r.name === "super-admin") ?? false;

  const { data, isLoading } = trpc.getPaymentHistory.useQuery(
    { page, per_page: 20 },
    { enabled: !!session?.user?.id && isSuperAdmin, placeholderData: keepPreviousData }
  );

  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="font-black uppercase italic opacity-30">Access denied.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={28} className="animate-spin" />
      </div>
    );
  }

  const summary      = data?.summary;
  const byPublisher  = data?.by_publisher ?? [];
  const byBook       = data?.by_book      ?? [];
  const lineItems    = data?.line_items   ?? [];
  const pagination   = data?.pagination;

  const totalAuthors = (data?.by_author ?? []).length;

  return (
    <div className="space-y-10">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b-4 border-black pb-8">
        <div>
          <h1 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter">
            Platform Ledger<span className="text-accent">.</span>
          </h1>
          <p className="font-bold text-xs uppercase opacity-40 tracking-widest mt-2 flex items-center gap-2">
            <DollarSign size={14} />
            All Captured Payments — Full Ledger
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total GMV"
          value={`₦${(summary?.total_sales ?? 0).toLocaleString()}`}
          sub="Gross across all publishers"
          icon={BarChart3}
        />
        <StatCard
          title="Platform Earnings"
          value={`₦${(summary?.platform_total ?? 0).toLocaleString()}`}
          sub="Total platform fees collected"
          icon={DollarSign}
          accent
        />
        <StatCard
          title="Publishers"
          value={byPublisher.length.toString()}
          sub="With captured sales"
          icon={Building2}
        />
        <StatCard
          title="Authors Paid"
          value={totalAuthors.toString()}
          sub="Across all publishers"
          icon={TrendingUp}
        />
      </div>

      {/* Breakdown tabs */}
      <Tabs defaultValue="publishers" className="w-full">
        <TabsList className="bg-transparent h-auto p-0 gap-4 mb-6">
          {["publishers", "books", "transactions"].map(tab => (
            <TabsTrigger
              key={tab}
              value={tab}
              className="rounded-none border-4 border-black px-5 py-2.5 font-black uppercase italic text-sm data-[state=active]:bg-accent data-[state=active]:gumroad-shadow transition-all"
            >
              {tab === "publishers" ? "By Publisher"
               : tab === "books"   ? "By Book"
               : "All Transactions"}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* By Publisher */}
        <TabsContent value="publishers">
          <div className="bg-white border-4 border-black gumroad-shadow">
            {/* Column headers */}
            <div className="hidden sm:grid grid-cols-[1fr_auto] gap-4 px-5 py-3 border-b-[1.5px] border-black bg-black/[0.03]">
              <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Publisher</p>
              <div className="grid grid-cols-3 gap-6 text-right">
                {["GMV", "Publisher", "Platform"].map(h => (
                  <p key={h} className="text-[9px] font-black uppercase tracking-widest opacity-40">{h}</p>
                ))}
              </div>
            </div>
            {byPublisher.length === 0 ? (
              <div className="py-20 text-center">
                <p className="font-black uppercase italic opacity-20 text-lg">No data yet.</p>
              </div>
            ) : byPublisher.map((pub) => (
              <PublisherRow key={pub.publisher_id} pub={pub} />
            ))}
          </div>
        </TabsContent>

        {/* By Book */}
        <TabsContent value="books">
          <div className="bg-white border-4 border-black gumroad-shadow">
            {byBook.length === 0 ? (
              <div className="py-20 text-center">
                <p className="font-black uppercase italic opacity-20 text-lg">No data yet.</p>
              </div>
            ) : byBook.map((book) => (
              <div key={book.book_id} className="flex items-center gap-4 p-4 border-b-[1.5px] border-black/10 last:border-0 hover:bg-black/[0.02]">
                <div className="w-10 h-14 shrink-0 border-[1.5px] border-black/10 overflow-hidden bg-black/5">
                  {book.cover
                    ? <img src={book.cover} alt={book.title} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-[8px] font-black text-black/20 uppercase">No img</div>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black uppercase italic text-sm truncate">{book.title}</p>
                  <p className="text-[10px] font-medium text-gray-400">{book.author_name} · {book.units_sold} sold</p>
                </div>
                <div className="text-right space-y-0.5">
                  <p className="font-black text-base italic">₦{book.total_sales.toLocaleString()}</p>
                  <p className="text-[9px] text-accent font-black">₦{book.platform_fee.toLocaleString()} platform</p>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* All Transactions */}
        <TabsContent value="transactions">
          <div className="bg-white border-4 border-black gumroad-shadow">
            {lineItems.length === 0 ? (
              <div className="py-20 text-center">
                <p className="font-black uppercase italic opacity-20 text-lg">No transactions yet.</p>
              </div>
            ) : (
              <>
                {lineItems.map((item) => (
                  <AdminTransactionRow key={item.id} item={item} />
                ))}
                <Pagination
                  page={page}
                  totalPages={pagination?.total_pages ?? 1}
                  onPrev={() => setPage(p => Math.max(1, p - 1))}
                  onNext={() => setPage(p => p + 1)}
                />
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}