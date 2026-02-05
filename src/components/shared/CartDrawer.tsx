// src/components/shared/CartDrawer.tsx
"use client";

import { useState, useEffect } from "react"; // Added useEffect/useState
import { useCartStore } from "@/store/use-cart-store";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { trpc } from "@/app/_providers/trpc-provider";
import { useSession } from "next-auth/react";
import { ShoppingBag, Trash2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils"; // FIXED: Import cn
import { GUEST_CART_KEY, notifyCartUpdate } from "@/lib/cart-utils";

export default function CartDrawer() {
  const { isOpen, closeCart } = useCartStore();
  const { data: session } = useSession();
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const userId = session?.user?.id;

  // Local state for guest items to make them reactive
  const [guestItems, setGuestItems] = useState<any[]>([]);

  // 1. Fetch Auth Cart
  const { data: userCartItems, isLoading } = trpc.getCartsByUser.useQuery(
    { user_id: userId as string },
    { enabled: !!userId }
  );

  // 2. Observer Logic: Listen for localStorage changes
  useEffect(() => {
    const loadGuestCart = () => {
      const stored = localStorage.getItem(GUEST_CART_KEY);
      setGuestItems(stored ? JSON.parse(stored) : []);
    };

    loadGuestCart(); // Initial load
    window.addEventListener("cart-updated", loadGuestCart);
    return () => window.removeEventListener("cart-updated", loadGuestCart);
  }, []);

  const displayItems = userId ? userCartItems : guestItems;

  // 3. Delete Handler
  const deleteMutation = trpc.deleteCartItem.useMutation({
    onSuccess: () => {
      utils.getCartsByUser.invalidate();
      toast({ title: "Removed", description: "Item removed from bag." });
    }
  });

  const handleDelete = (id: string) => {
    if (userId) {
      deleteMutation.mutate({ id });
    } else {
      const filtered = guestItems.filter((item) => item.id !== id);
      localStorage.setItem(GUEST_CART_KEY, JSON.stringify(filtered));
      notifyCartUpdate(); // Trigger the observer!
      toast({ title: "Removed", description: "Guest item removed." });
    }
  };

  const subtotal = displayItems?.reduce((acc, item) => acc + (item.total || 0), 0) || 0;

  return (
    <Sheet open={isOpen} onOpenChange={closeCart}>
      <SheetContent className="w-full sm:max-w-md border-l-4 border-black p-0 bg-[#FCFAEE] flex flex-col">
        <SheetHeader className="p-6 border-b-4 border-black bg-white">
          <SheetTitle className="text-2xl font-black uppercase italic flex items-center gap-3">
            <ShoppingBag className="text-accent" /> Your Bag
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading && userId ? (
            <div className="text-center font-bold animate-pulse">Loading...</div>
          ) : displayItems?.length === 0 ? (
            <div className="text-center py-20 font-black uppercase italic opacity-20 text-4xl">Empty</div>
          ) : (
            displayItems?.map((item) => (
              <div key={item.id} className="flex gap-4 bg-white border-2 border-black p-4 gumroad-shadow-sm group">
                <div className="relative h-20 w-16 border-2 border-black shrink-0">
                  <Image src={item.book_image || "/bookcover.png"} alt={item.book_title} fill className="object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-black uppercase text-[10px] truncate">{item.book_title}</h4>
                  <p className="text-[8px] font-bold text-accent uppercase italic">{item.book_type}</p>
                  <p className="font-black text-sm mt-2">₦{item.price.toLocaleString()}</p>
                </div>
                <button 
                  onClick={() => handleDelete(item.id)}
                  className="text-gray-300 hover:text-destructive transition-colors p-2"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>

        {displayItems && displayItems.length > 0 && (
          <div className="p-6 border-t-4 border-black bg-white space-y-4">
            <div className="flex justify-between items-end">
              <span className="font-bold uppercase text-[10px] opacity-50">Subtotal</span>
              <span className="text-2xl font-black italic">₦{subtotal.toLocaleString()}</span>
            </div>
            <Link href="/cart" onClick={closeCart}>
              <Button className="w-full booka-button-primary h-14 text-lg">
                View Bag <ArrowRight className="ml-2" />
              </Button>
            </Link>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}