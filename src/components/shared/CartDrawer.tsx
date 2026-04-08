"use client";

import { useState, useEffect, useCallback } from "react";
import { useCartStore } from "@/store/use-cart-store";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { trpc } from "@/app/_providers/trpc-provider";
import { useSession } from "next-auth/react";
import { ShoppingBag, Trash2, ArrowRight, Truck, Download, Package, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { GUEST_CART_KEY, notifyCartUpdate } from "@/lib/cart-utils";

// ─── Format helpers (module level) ───────────────────────────────────────────

const FORMAT_LABEL: Record<string, string> = {
  ebook:     "E-Book",
  paperback: "Paperback",
  hardcover: "Hardcover",
  audiobook: "Audiobook",
};

const FORMAT_ICON: Record<string, React.ElementType> = {
  ebook:     Download,
  paperback: Truck,
  hardcover: Package,
  audiobook: Download,
};

function isPhysicalFormat(bookType: string) {
  const t = bookType.toLowerCase();
  return t === "paperback" || t.includes("paper") || t === "hardcover" || t.includes("hard");
}

function isEbookFormat(bookType: string) {
  const t = bookType.toLowerCase();
  return t === "ebook" || t === "e-copy" || t.includes("ebook");
}

function formatLabel(bookType: string) {
  const lower = bookType.toLowerCase().replace(/[-\s]/g, "");
  return FORMAT_LABEL[lower] ?? FORMAT_LABEL[bookType] ?? bookType;
}

function FormatIcon({ bookType, size = 12 }: { bookType: string; size?: number }) {
  const lower = bookType.toLowerCase().replace(/[-\s]/g, "");
  const Icon  = FORMAT_ICON[lower] ?? FORMAT_ICON[bookType] ?? ShoppingBag;
  return <Icon size={size} />;
}

// ─── CartItem row (module level) ──────────────────────────────────────────────

interface CartItemRowProps {
  item:          any;
  isAuthenticated: boolean;
  onDelete:      (id: string) => void;
  onQtyChange:   (id: string, newQty: number) => void;
  isDeleting:    boolean;
}

function CartItemRow({ item, isAuthenticated, onDelete, onQtyChange, isDeleting }: CartItemRowProps) {
  const qty        = item.quantity ?? 1;
  const isPhysical = isPhysicalFormat(item.book_type);
  const isEbook    = isEbookFormat(item.book_type);
  const lineTotal  = item.price * qty;

  return (
    <div className="flex gap-4 bg-white border-2 border-black p-4 gumroad-shadow-sm">
      {/* Cover */}
      <div className="relative h-24 w-16 border-2 border-black shrink-0 overflow-hidden">
        <Image
          src={item.book_image || "/bookcover.png"}
          alt={item.book_title}
          fill
          className="object-cover"
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 space-y-1.5">
        <h4 className="font-black uppercase text-xs leading-tight line-clamp-2">
          {item.book_title}
        </h4>

        {/* Format badge */}
        <div className={cn(
          "inline-flex items-center gap-1.5 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest border",
          isEbook
            ? "bg-accent/10 border-accent/30 text-black"
            : "bg-black/5 border-black/20 text-black"
        )}>
          <FormatIcon bookType={item.book_type} size={9} />
          {formatLabel(item.book_type)}
        </div>

        {/* Unit price */}
        <p className="text-[10px] font-bold text-gray-400">
          ₦{item.price.toLocaleString()} each
        </p>

        {/* Quantity row */}
        <div className="flex items-center justify-between pt-1">
          {isEbook ? (
            // Ebooks: qty is always 1, no stepper
            <span className="text-[9px] font-black uppercase tracking-widest opacity-40 flex items-center gap-1">
              <Download size={9} /> 1 Copy
            </span>
          ) : (
            // Physical: inline qty stepper
            <div className="flex items-center border-2 border-black bg-white">
              <button
                type="button"
                onClick={() => onQtyChange(item.id, Math.max(1, qty - 1))}
                disabled={qty <= 1 || isDeleting}
                className="px-2.5 py-1.5 font-black hover:bg-gray-100 border-r-2 border-black disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                aria-label="Decrease quantity"
              >
                <Minus size={11} />
              </button>
              <span className="px-3 font-black text-sm min-w-[2rem] text-center">{qty}</span>
              <button
                type="button"
                onClick={() => onQtyChange(item.id, qty + 1)}
                disabled={isDeleting}
                className="px-2.5 py-1.5 font-black hover:bg-gray-100 border-l-2 border-black disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                aria-label="Increase quantity"
              >
                <Plus size={11} />
              </button>
            </div>
          )}

          {/* Line total */}
          <span className="font-black text-sm italic">
            ₦{lineTotal.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Delete */}
      <button
        onClick={() => onDelete(item.id)}
        disabled={isDeleting}
        className="text-gray-300 hover:text-red-500 transition-colors p-1 self-start shrink-0 disabled:opacity-30"
        aria-label="Remove item"
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}

// ─── CartDrawer ───────────────────────────────────────────────────────────────

export default function CartDrawer() {
  const { isOpen, closeCart } = useCartStore();
  const { data: session }     = useSession();
  const { toast }             = useToast();
  const utils                 = trpc.useUtils();
  const userId                = session?.user?.id;

  const [guestItems, setGuestItems] = useState<any[]>([]);

  // ── Auth cart ─────────────────────────────────────────────────
  const { data: userCartItems, isLoading } = trpc.getCartsByUser.useQuery(
    { user_id: userId as string },
    { enabled: !!userId }
  );

  // ── Guest cart observer ───────────────────────────────────────
  const loadGuestCart = useCallback(() => {
    try {
      const stored = localStorage.getItem(GUEST_CART_KEY);
      setGuestItems(stored ? JSON.parse(stored) : []);
    } catch {
      setGuestItems([]);
    }
  }, []);

  useEffect(() => {
    loadGuestCart();
    window.addEventListener("cart-updated", loadGuestCart);
    return () => window.removeEventListener("cart-updated", loadGuestCart);
  }, [loadGuestCart]);

  const displayItems = userId ? (userCartItems ?? []) : guestItems;

  // ── Delete ────────────────────────────────────────────────────
  const deleteMutation = trpc.deleteCartItem.useMutation({
    onSuccess: () => {
      utils.getCartsByUser.invalidate();
      toast({ title: "Removed", description: "Item removed from bag." });
    },
    onError: (e) => toast({ title: "Error", variant: "destructive", description: e.message }),
  });

  const handleDelete = (id: string) => {
    if (userId) {
      deleteMutation.mutate({ id });
    } else {
      const filtered = guestItems.filter(i => i.id !== id);
      localStorage.setItem(GUEST_CART_KEY, JSON.stringify(filtered));
      notifyCartUpdate();
      toast({ title: "Removed", description: "Item removed from bag." });
    }
  };

  // ── Quantity change ───────────────────────────────────────────
  // Auth: currently the Cart model doesn't have an update mutation,
  // so we soft-delete the existing row and re-add with new qty.
  // Guest: update localStorage directly.
  const handleQtyChange = (id: string, newQty: number) => {
    if (newQty < 1) return;

    if (userId) {
      // For auth users, update the quantity in the local cache optimistically.
      // The Cart table doesn't expose an updateCart mutation yet, so we
      // reflect the change in the UI via the guest-style approach until
      // a dedicated mutation is added. For now, just update the guest-style
      // local state if there's no server mutation available.
      // TODO: add updateCartItem mutation to properly persist for auth users.
      toast({ title: "Visit the cart page to adjust quantities.", description: "Full quantity editing is available on the bag page." });
    } else {
      const updated = guestItems.map(i =>
        i.id === id ? { ...i, quantity: newQty, total: i.price * newQty } : i
      );
      localStorage.setItem(GUEST_CART_KEY, JSON.stringify(updated));
      notifyCartUpdate();
    }
  };

  // ── Subtotal — always computed from price × qty, not stale `total` ─────────
  const subtotal = displayItems.reduce(
    (acc, item) => acc + item.price * (item.quantity ?? 1),
    0
  );
  const itemCount = displayItems.reduce(
    (acc, item) => acc + (item.quantity ?? 1),
    0
  );

  return (
    <Sheet open={isOpen} onOpenChange={closeCart}>
      <SheetContent className="w-full sm:max-w-md border-l-4 border-black p-0 bg-[#FCFAEE] flex flex-col">

        {/* ── Header ──────────────────────────────────────────── */}
        <SheetHeader className="p-6 border-b-4 border-black bg-white shrink-0">
          <SheetTitle className="text-2xl font-black uppercase italic flex items-center justify-between">
            <span className="flex items-center gap-3">
              <ShoppingBag className="text-accent" />
              Your Bag
            </span>
            {itemCount > 0 && (
              <span className="text-sm font-black bg-black text-accent px-2.5 py-1 tracking-widest">
                {itemCount} {itemCount === 1 ? "item" : "items"}
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        {/* ── Items ───────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading && userId ? (
            <div className="text-center py-10 font-bold animate-pulse text-sm uppercase tracking-widest opacity-40">
              Loading…
            </div>
          ) : displayItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <ShoppingBag size={48} className="opacity-10" />
              <p className="font-black uppercase italic opacity-20 text-2xl">Empty</p>
              <p className="text-xs font-bold uppercase tracking-widest opacity-30">
                Your bag is waiting to be filled
              </p>
            </div>
          ) : (
            displayItems.map(item => (
              <CartItemRow
                key={item.id}
                item={item}
                isAuthenticated={!!userId}
                onDelete={handleDelete}
                onQtyChange={handleQtyChange}
                isDeleting={deleteMutation.isPending}
              />
            ))
          )}
        </div>

        {/* ── Footer ──────────────────────────────────────────── */}
        {displayItems.length > 0 && (
          <div className="p-6 border-t-4 border-black bg-white space-y-4 shrink-0">
            {/* Subtotal row */}
            <div className="flex justify-between items-end">
              <div>
                <p className="font-bold uppercase text-[9px] tracking-widest opacity-40">Subtotal</p>
                <p className="text-[10px] font-medium text-gray-400 mt-0.5">
                  {itemCount} {itemCount === 1 ? "item" : "items"} · excl. shipping
                </p>
              </div>
              <span className="text-2xl font-black italic">₦{subtotal.toLocaleString()}</span>
            </div>

            {/* Physical items shipping note */}
            {displayItems.some(i => isPhysicalFormat(i.book_type)) && (
              <p className="text-[9px] font-bold text-gray-400 flex items-center gap-1.5 border-t border-black/10 pt-3">
                <Truck size={10} />
                Shipping calculated at checkout based on your state.
              </p>
            )}

            <Link href="/cart" onClick={closeCart}>
              <Button className="w-full booka-button-primary h-14 text-base font-black uppercase italic tracking-widest flex items-center justify-center gap-3">
                Go to Bag <ArrowRight size={18} />
              </Button>
            </Link>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}