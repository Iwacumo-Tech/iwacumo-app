"use client";


import { useState } from "react";
import { trpc } from "@/app/_providers/trpc-provider";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  DollarSign, BookOpen, TrendingUp, Loader2,
  ChevronLeft, ChevronRight, ArrowRight, BadgeCheck,
  AlertTriangle, ExternalLink, BarChart3, Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { keepPreviousData } from "@tanstack/react-query";


// ─── Sub-components (module level — hard rule #4) ─────────────────────────────

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

function BookRow({
  book, isPublisher,
}: {
  book: {
    book_id: string; title: string; cover: string | null;
    author_name: string; total_sales: number; units_sold: number;
    publisher_earnings: number; author_earnings: number; platform_fee: number;
  };
  isPublisher: boolean;
}) {
  const myEarnings = isPublisher ? book.publisher_earnings : book.author_earnings;
  return (
    <div className="flex items-center gap-4 p-4 border-b-[1.5px] border-black/10 last:border-0 hover:bg-black/[0.02] transition-colors">
      {/* Cover */}
      <div className="w-10 h-14 shrink-0 border-[1.5px] border-black/10 overflow-hidden bg-black/5">
        {book.cover
          ? <img src={book.cover} alt={book.title} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-[8px] font-black text-black/20 uppercase">No img</div>
        }
      </div>
      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-black uppercase italic text-sm truncate">{book.title}</p>
        <p className="text-[10px] font-medium text-gray-400">{book.author_name} · {book.units_sold} sold</p>
      </div>
      {/* Earnings */}
      <div className="text-right shrink-0">
        <p className="font-black text-lg italic">₦{myEarnings.toLocaleString()}</p>
        <p className="text-[9px] font-medium text-gray-400">
          of ₦{book.total_sales.toLocaleString()} total
        </p>
      </div>
    </div>
  );
}

function TransactionRow({
  item, isPublisher,
}: {
  item: {
    id: string; order_number: string; order_id: string; order_date: string;
    customer_name: string; book_title: string; format: string;
    quantity: number; total_price: number;
    publisher_earnings: number; author_earnings: number; platform_fee: number;
    author_name: string;
  };
  isPublisher: boolean;
}) {
  const myEarnings = isPublisher ? item.publisher_earnings : item.author_earnings;
  const date = new Date(item.order_date).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
  return (
    <div className="grid grid-cols-[1fr_auto] gap-4 items-center px-5 py-4 border-b-[1.5px] border-black/10 last:border-0 hover:bg-black/[0.02] transition-colors text-sm">
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-black uppercase italic truncate">{item.book_title}</p>
          <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 border border-black/20 text-gray-400">
            {item.format}
          </span>
        </div>
        <p className="text-[10px] font-medium text-gray-400 mt-0.5">
          {item.customer_name} · {date} ·{" "}
          <Link href={`/app/orders`} className="hover:text-accent transition-colors">
            {item.order_number}
          </Link>
        </p>
      </div>
      <div className="text-right">
        <p className="font-black text-base italic">₦{myEarnings.toLocaleString()}</p>
        <p className="text-[9px] text-gray-400">of ₦{item.total_price.toLocaleString()}</p>
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
      <button
        onClick={onPrev}
        disabled={page <= 1}
        className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest disabled:opacity-30 hover:text-accent transition-colors"
      >
        <ChevronLeft size={14} /> Prev
      </button>
      <span className="text-[10px] font-black uppercase tracking-widest opacity-50">
        Page {page} of {totalPages}
      </span>
      <button
        onClick={onNext}
        disabled={page >= totalPages}
        className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest disabled:opacity-30 hover:text-accent transition-colors"
      >
        Next <ChevronRight size={14} />
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PaymentsPage() {
  const { data: session } = useSession();
  const [page, setPage] = useState(1);

  const userRoles    = session?.roles ?? [];
  const isPublisher  = userRoles.some(r => r.name === "publisher");
  const isSuperAdmin = userRoles.some(r => r.name === "super-admin");

  // Super-admins have their own page at /app/admin/payments
  // This page is for publishers and authors only.

  const { data, isLoading } = trpc.getPaymentHistory.useQuery(
    { page, per_page: 20 },
    { enabled: !!session?.user?.id, placeholderData: keepPreviousData }
  );

  // Check if this user has a bank account set up
  const { data: paymentAccount } = trpc.getMyPaymentAccount.useQuery(undefined, {
    enabled: !!session?.user?.id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={28} className="animate-spin" />
      </div>
    );
  }

  const summary    = data?.summary;
  const byBook     = data?.by_book     ?? [];
  const byAuthor   = data?.by_author   ?? [];
  const lineItems  = data?.line_items  ?? [];
  const pagination = data?.pagination;

  const earningsLabel = isPublisher ? "Publisher Earnings" : "Author Earnings";

  return (
    <div className="space-y-10">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b-4 border-black pb-8">
        <div>
          <h1 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter">
            Earnings<span className="text-accent">.</span>
          </h1>
          <p className="font-bold text-xs uppercase opacity-40 tracking-widest mt-2 flex items-center gap-2">
            <DollarSign size={14} />
            {earningsLabel} — All Captured Payments
          </p>
        </div>
        <Link
          href="/app/settings/payment"
          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest border-[1.5px] border-black px-4 py-2.5 hover:bg-black hover:text-white transition-colors"
        >
          {paymentAccount
            ? <><BadgeCheck size={12} className="text-green-500" /> Payout Account</>
            : <><AlertTriangle size={12} className="text-amber-500" /> Set Up Payout</>
          }
          <ExternalLink size={10} />
        </Link>
      </div>

      {/* Payout account nudge */}
      {!paymentAccount && (
        <div className="flex items-center gap-4 p-4 border-[1.5px] border-amber-300 bg-amber-50">
          <AlertTriangle size={16} className="text-amber-500 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-black uppercase italic">Payout account not connected</p>
            <p className="text-xs font-medium text-amber-700 mt-0.5">
              Your earnings are being tracked but won't be automatically routed until you connect a bank account.
            </p>
          </div>
          <Link
            href="/app/settings/payment"
            className="shrink-0 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest bg-amber-500 text-white px-3 py-2 hover:bg-amber-600 transition-colors"
          >
            Set Up <ArrowRight size={10} />
          </Link>
        </div>
      )}

      {/* Summary stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Sales"
          value={`₦${(summary?.total_sales ?? 0).toLocaleString()}`}
          sub="Gross across all books"
          icon={BarChart3}
        />
        <StatCard
          title={earningsLabel}
          value={`₦${(summary?.my_earnings ?? 0).toLocaleString()}`}
          sub="After platform fee"
          icon={DollarSign}
          accent
        />
        <StatCard
          title="Books Sold"
          value={byBook.reduce((a, b) => a + b.units_sold, 0).toString()}
          sub="Total units across formats"
          icon={BookOpen}
        />
        <StatCard
          title="Titles Earning"
          value={byBook.length.toString()}
          sub="Books with captured sales"
          icon={TrendingUp}
        />
      </div>

      {/* Breakdown tabs */}
      <Tabs defaultValue="books" className="w-full">
        <TabsList className="bg-transparent h-auto p-0 gap-4 mb-6">
          {(["books", "transactions", ...(isPublisher ? ["authors"] : [])]).map(tab => (
            <TabsTrigger
              key={tab}
              value={tab}
              className="rounded-none border-4 border-black px-5 py-2.5 font-black uppercase italic text-sm data-[state=active]:bg-accent data-[state=active]:gumroad-shadow transition-all"
            >
              {tab === "books"        ? "By Book"
               : tab === "authors"   ? "By Author"
               : "Transactions"}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* By Book */}
        <TabsContent value="books">
          <div className="bg-white border-4 border-black gumroad-shadow">
            {byBook.length === 0 ? (
              <div className="py-20 text-center">
                <p className="font-black uppercase italic opacity-20 text-lg">No sales yet.</p>
              </div>
            ) : byBook.map((book) => (
              <BookRow key={book.book_id} book={book} isPublisher={isPublisher} />
            ))}
          </div>
        </TabsContent>

        {/* By Author (publisher only) */}
        {isPublisher && (
          <TabsContent value="authors">
            <div className="bg-white border-4 border-black gumroad-shadow">
              {byAuthor.length === 0 ? (
                <div className="py-20 text-center">
                  <p className="font-black uppercase italic opacity-20 text-lg">No author data yet.</p>
                </div>
              ) : byAuthor.map((author) => (
                <div key={author.author_id} className="flex items-center gap-4 px-5 py-4 border-b-[1.5px] border-black/10 last:border-0 hover:bg-black/[0.02]">
                  <div className="w-8 h-8 bg-black flex items-center justify-center text-accent text-[10px] font-black shrink-0">
                    {author.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black uppercase italic text-sm">{author.name}</p>
                    <p className="text-[10px] font-medium text-gray-400">{author.email} · {author.units_sold} units sold</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-base italic">₦{author.author_earnings.toLocaleString()}</p>
                    <p className="text-[9px] text-gray-400">author earnings</p>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        )}

        {/* Transactions */}
        <TabsContent value="transactions">
          <div className="bg-white border-4 border-black gumroad-shadow">
            {lineItems.length === 0 ? (
              <div className="py-20 text-center">
                <p className="font-black uppercase italic opacity-20 text-lg">No transactions yet.</p>
              </div>
            ) : (
              <>
                {lineItems.map((item) => (
                  <TransactionRow key={item.id} item={item} isPublisher={isPublisher} />
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