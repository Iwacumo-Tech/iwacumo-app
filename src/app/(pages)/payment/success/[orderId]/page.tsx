"use client";

import { trpc } from "@/app/_providers/trpc-provider";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function PaymentSuccessPage({ params }: { params: { orderId: string } }) {
  // Marked as client component to use tRPC hooks
  const { data: order, isLoading } = trpc.getOrderById.useQuery({ id: params.orderId });

  if (isLoading) return <div className="p-20 text-center font-bold">Verifying your access...</div>;

  return (
    <div className="max-w-2xl mx-auto py-16 px-6 space-y-10">
      {/* Success Banner - Using Gumroad-style high contrast */}
      <div className="border-4 border-black p-8 gumroad-shadow bg-white text-center animate-in zoom-in duration-300">
        <h1 className="text-4xl font-black uppercase italic tracking-tighter">Success!</h1>
        <p className="mt-2 font-bold text-gray-600">Order #{params.orderId.slice(-6).toUpperCase()}</p>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-black uppercase">Your Items</h2>
        <div className="grid gap-4">
          {order?.line_items.map((item) => (
            <div key={item.id} className="bg-white border-2 border-black p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <p className="font-black text-lg uppercase leading-tight">{item.book_variant.book.title}</p>
                <p className="text-xs font-bold text-gray-500 uppercase">{item.book_variant.format}</p>
              </div>

              <div className="flex gap-2 w-full md:w-auto">
                {/* Conditional delivery logic: Digital vs Physical */}
                {item.book_variant.format === 'ebook' ? (
                  <>
                    <Link href={`/app/books/view/${item.book_variant.book_id}`} className="flex-1">
                      <Button className="w-full rounded-none border-2 border-black bg-[#FF90E8] text-black font-bold hover:shadow-none transition-all">
                        Read Online
                      </Button>
                    </Link>
                    {/* Buyer-specific watermarked PDF logic is handled in the existing viewer */}
                  </>
                ) : (
                  <div className="text-right italic text-sm font-medium border-l-2 border-black pl-4">
                    Processing for delivery. Check your email for shipping updates.
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Link href="/shop" className="block text-center underline font-bold hover:text-[#FF90E8]">
        Continue Shopping
      </Link>
    </div>
  );
}