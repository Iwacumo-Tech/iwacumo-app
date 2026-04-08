"use client";

import { trpc } from "@/app/_providers/trpc-provider";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CheckCircle2, BookOpen, Package, ArrowRight, Loader2 } from "lucide-react";

export default function PaymentSuccessPage({ params }: { params: { orderId: string } }) {
  const { data: order, isLoading } = trpc.getOrderById.useQuery({ id: params.orderId });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF9F6]">
        <div className="text-center space-y-4">
          <Loader2 className="animate-spin h-10 w-10 mx-auto opacity-30" />
          <p className="font-black uppercase italic text-xs tracking-widest animate-pulse">
            Confirming your order…
          </p>
        </div>
      </div>
    );
  }

  // Separate line items by format
  const lineItems = order?.line_items ?? [];
  const ebookItems    = lineItems.filter(i => i.book_variant.format === "ebook");
  const physicalItems = lineItems.filter(i =>
    i.book_variant.format === "paperback" || i.book_variant.format === "hardcover"
  );

  return (
    <div className="min-h-screen bg-[#FAF9F6] py-16 px-6">
      <div className="max-w-2xl mx-auto space-y-10">

        {/* ── Success banner ──────────────────────────────────────────── */}
        <div className="bg-white border-4 border-black gumroad-shadow p-8 text-center">
          <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-black">
            <CheckCircle2 size={32} className="text-black" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter">
            Payment Confirmed<span className="text-accent">.</span>
          </h1>
          <p className="mt-3 font-bold text-gray-500 text-sm uppercase tracking-widest">
            Order #{params.orderId.slice(-8).toUpperCase()}
          </p>
        </div>

        {/* ── Digital books ───────────────────────────────────────────── */}
        {ebookItems.length > 0 && (
          <div className="space-y-4">
            <h2 className="font-black uppercase italic text-xl flex items-center gap-2">
              <BookOpen size={18} /> Digital Books
            </h2>
            <div className="space-y-3">
              {ebookItems.map(item => (
                <div
                  key={item.id}
                  className="bg-white border-2 border-black p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                >
                  <div>
                    <p className="font-black text-base uppercase italic leading-tight">
                      {item.book_variant.book?.title}
                    </p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-accent mt-1">
                      E-Book — Ready to read
                    </p>
                  </div>
                  {/* Reader route — the public /book/[id] page renders ViewBookPage */}
                  <Link href={`/book/${item.book_variant.book_id}`}>
                    <Button className="booka-button-primary h-12 px-6 text-sm shrink-0 flex items-center gap-2">
                      <BookOpen size={16} /> Read Now
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Physical books ──────────────────────────────────────────── */}
        {physicalItems.length > 0 && (
          <div className="space-y-4">
            <h2 className="font-black uppercase italic text-xl flex items-center gap-2">
              <Package size={18} /> Physical Books
            </h2>
            <div className="space-y-3">
              {physicalItems.map(item => (
                <div
                  key={item.id}
                  className="bg-white border-2 border-black p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                >
                  <div>
                    <p className="font-black text-base uppercase italic leading-tight">
                      {item.book_variant.book?.title}
                    </p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1 capitalize">
                      {item.book_variant.format} — Being prepared for dispatch
                    </p>
                  </div>
                  <div className="text-[11px] font-medium text-gray-500 italic border-l-2 border-black pl-4 max-w-xs">
                    You'll receive a shipping notification with your tracking number once dispatched.
                  </div>
                </div>
              ))}
            </div>

            {/* Dashboard nudge for physical orders */}
            <div className="bg-black text-white p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <p className="font-black uppercase italic text-sm">In the meantime</p>
                <p className="text-xs text-white/60 mt-1 font-medium">
                  Track your order status and manage your books from your dashboard.
                </p>
              </div>
              <Link href="/app/books">
                <Button
                  variant="outline"
                  className="border-2 border-white bg-accent text-white hover:bg-white hover:text-black font-black uppercase italic text-xs h-12 px-6 rounded-none shrink-0 flex items-center gap-2"
                >
                  My Orders <ArrowRight size={14} />
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* ── Continue shopping ───────────────────────────────────────── */}
        <div className="text-center pt-4">
          <Link
            href="/shop"
            className="text-[11px] font-black uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity underline underline-offset-4"
          >
            Continue Shopping
          </Link>
        </div>

      </div>
    </div>
  );
}