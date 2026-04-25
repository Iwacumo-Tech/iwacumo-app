"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Trash2, ArrowLeft, CreditCard, ShoppingBag,
  Truck, Download, ShieldCheck, MapPin, Loader2,
} from "lucide-react";
import { Button }   from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { useSession, signIn } from "next-auth/react";
import { trpc } from "@/app/_providers/trpc-provider";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import DeliveryForm         from "@/components/checkout/delivery-form";
import GuestRegistrationForm from "@/components/checkout/guest-registration-form";
import { TDeliveryAddressSchema, TCreateCustomerSchema } from "@/server/dtos";
import { GUEST_CART_KEY, notifyCartUpdate } from "@/lib/cart-utils";
import { getShippingZone, calcShippingCost, SHIPPING_ZONES } from "@/lib/constants";
import Link from "next/link";

type CartItem = {
  id:         string;
  book_image: string;
  book_title: string;
  book_type:  string;
  price:      number;
  quantity?:  number | null;
  total?:     number;
};

// ─── helpers ─────────────────────────────────────────────────────────────────

function isPhysical(bookType: string) {
  const t = bookType.toLowerCase();
  return t.includes("paper") || t.includes("hard");
}

function isEbook(bookType: string) {
  return bookType.toLowerCase().includes("ebook");
}

// Default weight fallback when BookVariant.weight_grams is unknown at client time.
// The server will recompute from real variant data anyway.
const DEFAULT_WEIGHT_GRAMS_PER_ITEM = 400;

// ─── component ───────────────────────────────────────────────────────────────

export default function CartPage() {
  const { data: session, status, update } = useSession();
  const { toast }  = useToast();
  const utils       = trpc.useUtils();

  const userId          = session?.user?.id as string;
  const isAuthenticated = status === "authenticated";

  // ── server data ──────────────────────────────────────────────────────────

  const { data: userCartItems, isLoading: cartLoading } =
    trpc.getCartsByUser.useQuery(
      { user_id: userId },
      { enabled: !!userId && isAuthenticated }
    );

  // Fetch system settings once so we can calculate real shipping rates client-side.
  const { data: systemSettings } = trpc.getSystemSettings.useQuery(undefined, {
    staleTime: 5 * 60 * 1000, // cache for 5 min — these change rarely
  });

  // ── state ────────────────────────────────────────────────────────────────

  const [cartItems,              setCartItems]              = useState<CartItem[]>([]);
  const [showCheckoutDialog,     setShowCheckoutDialog]     = useState(false);
  const [showRegistrationDialog, setShowRegistrationDialog] = useState(false);
  const [requiresDelivery,       setRequiresDelivery]       = useState(false);
  const [registrationPassword,   setRegistrationPassword]   = useState("");
  // The state the customer selected in the delivery form — drives live shipping cost.
  const [selectedState,          setSelectedState]          = useState<string>("");

  // ── cart sync effects ────────────────────────────────────────────────────

  useEffect(() => {
    if (isAuthenticated && userCartItems) {
      setCartItems(userCartItems.map(item => ({ ...item, quantity: item.quantity ?? undefined })));
    } else if (!isAuthenticated) {
      const stored = localStorage.getItem(GUEST_CART_KEY);
      if (stored) {
        try { setCartItems(JSON.parse(stored)); } catch { localStorage.removeItem(GUEST_CART_KEY); }
      }
    }
  }, [isAuthenticated, userCartItems]);

  useEffect(() => {
    setRequiresDelivery(cartItems.some(item => isPhysical(item.book_type)));
  }, [cartItems]);

  useEffect(() => {
    const sync = () => {
      if (!isAuthenticated) {
        const stored = localStorage.getItem(GUEST_CART_KEY);
        setCartItems(stored ? JSON.parse(stored) : []);
      }
    };
    window.addEventListener("cart-updated", sync);
    return () => window.removeEventListener("cart-updated", sync);
  }, [isAuthenticated]);

  // ── shipping calculation ─────────────────────────────────────────────────
  //
  // Uses the Speedaf formula from lib/constants.ts:
  //   total weight = sum of (item.weight_grams * qty) for physical items only
  //   zone         = getShippingZone(selectedState)
  //   cost         = calcShippingCost(totalWeightGrams, zone, shippingRates)
  //
  // At the client we don't have weight_grams per item from the Cart model
  // (Cart is a lightweight table), so we use a per-item fallback of 400 g.
  // The server recomputes from real BookVariant.weight_grams before charging.

  const computeShipping = useCallback((): number => {
    if (!requiresDelivery) return 0;

    // If no state selected yet, show 0 and prompt via the UI hint below.
    if (!selectedState) return 0;

    const physicalItems = cartItems.filter(item => isPhysical(item.book_type));
    if (physicalItems.length === 0) return 0;

    const totalWeightGrams = physicalItems.reduce(
      (sum, item) => sum + DEFAULT_WEIGHT_GRAMS_PER_ITEM * (item.quantity ?? 1),
      0
    );

    const zone         = getShippingZone(selectedState);
    const shippingRates = (systemSettings?.shipping_rates as Record<string, { constant: number; variable: number }>) ?? {};

    // Fallback rates if SystemSettings aren't loaded yet (matches typical Speedaf NGN pricing)
    const fallbackRates: Record<string, { constant: number; variable: number }> = {
      Z1: { constant: 1500, variable: 500 },
      Z2: { constant: 2000, variable: 700 },
      Z3: { constant: 1800, variable: 600 },
      Z4: { constant: 1200, variable: 400 },
    };

    const rates = Object.keys(shippingRates).length > 0 ? shippingRates : fallbackRates;
    return calcShippingCost(totalWeightGrams, zone, rates);
  }, [requiresDelivery, selectedState, cartItems, systemSettings]);

  const shipping = computeShipping();
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * (item.quantity ?? 1), 0);
  const total    = subtotal + shipping;

  // Zone badge for UI feedback
  const shippingZone = selectedState ? getShippingZone(selectedState) : null;

  // ── mutations ────────────────────────────────────────────────────────────

  const initializePayment = trpc.initializePayment.useMutation({
    onSuccess: (data) => {
      if (data.authorization_url) window.location.href = data.authorization_url;
    },
    onError: (err) => {
      toast({ title: "Payment Error", variant: "destructive", description: err.message });
    },
  });

  const createOrderMutation = trpc.createOrderFromCart.useMutation({
    onSuccess: (order) => {
      if (!order) {
        toast({ title: "Order Error", variant: "destructive", description: "Order was created but could not be retrieved." });
        return;
      }
      initializePayment.mutate({
        order_id: order.id,
        email:    session?.user?.email || (order as any).customer?.user?.email,
        amount:   order.total_amount,
        currency: "NGN",
      });
      localStorage.removeItem(GUEST_CART_KEY);
      utils.getCartsByUser.invalidate();
    },
    onError: (err) => {
      toast({ title: "Order Failed", variant: "destructive", description: err.message });
    },
  });

  const deleteCartItemMutation = trpc.deleteCartItem.useMutation({
    onSuccess: () => {
      toast({ title: "Success", description: "Item removed from bag" });
      utils.getCartsByUser.invalidate();
    },
  });

  const registerGuestMutation = trpc.registerGuestAndTransferCart.useMutation({
    onSuccess: async (data) => {
      const username = data.user.username || data.user.email;
      const result   = await signIn("credentials", { username, password: registrationPassword, redirect: false });
      if (result?.ok) {
        setRegistrationPassword("");
        localStorage.removeItem(GUEST_CART_KEY);
        if (update) await update();
        setShowRegistrationDialog(false);
        toast({ title: "Welcome to Booka!", description: "Account created. Finalizing your order…" });
        setTimeout(() => {
          if (requiresDelivery) setShowCheckoutDialog(true);
          else proceedWithCheckout();
        }, 800);
      }
    },
  });

  // ── handlers ─────────────────────────────────────────────────────────────

  const handleDeleteItem = (id: string) => {
    if (confirm("Remove this masterpiece from your bag?")) {
      if (isAuthenticated) {
        deleteCartItemMutation.mutate({ id });
      } else {
        const updated = cartItems.filter(item => item.id !== id);
        setCartItems(updated);
        localStorage.setItem(GUEST_CART_KEY, JSON.stringify(updated));
        window.dispatchEvent(new Event("cart-updated"));
      }
    }
  };

  const updateQuantity = (id: string, newQty: number) => {
    const updated = cartItems.map((item) => {
      if (item.id !== id) return item;
      if (isEbook(item.book_type)) return { ...item, quantity: 1 };

      const qty = Math.max(1, newQty);
      return { ...item, quantity: qty };
    });
    setCartItems(updated);
    if (!isAuthenticated) {
      localStorage.setItem(GUEST_CART_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event("cart-updated"));
    }
  };

  const handleCheckout = () => {
    if (!cartItems.length) return;
    if (!isAuthenticated) return setShowRegistrationDialog(true);
    if (requiresDelivery) return setShowCheckoutDialog(true);
    proceedWithCheckout();
  };

  const handleGuestRegistration = (data: TCreateCustomerSchema) => {
    if (data.password) setRegistrationPassword(data.password);
    registerGuestMutation.mutate({
      customer_data: data,
      cart_items: cartItems.map(item => ({
        book_image: item.book_image,
        book_title: item.book_title,
        book_type:  item.book_type,
        price:      item.price,
        quantity:   item.quantity ?? 1,
        total:      (item.quantity ?? 1) * item.price,
      })),
    });
  };

  const handleDeliverySubmit = (data: TDeliveryAddressSchema) => {
    // State from the form is the authoritative source — update selectedState
    // in case the user typed fast and onStateChange fired slightly late.
    if (data.state) setSelectedState(data.state);
    setShowCheckoutDialog(false);
    proceedWithCheckout(data);
  };

  // The single source of truth for creating an order.
  // shipping_amount is the computed real value — the server will verify it.
  const proceedWithCheckout = (deliveryData?: TDeliveryAddressSchema) => {
    if (!isAuthenticated || !userId) return;

    // Use the state from deliveryData if available (most accurate),
    // otherwise fall back to the live-updated selectedState.
    const stateForShipping = deliveryData?.state || selectedState;
    const finalShipping    = requiresDelivery && stateForShipping
      ? computeShipping()
      : 0;

    createOrderMutation.mutate({
      user_id:          userId,
      tax_amount:       0,
      shipping_amount:  finalShipping,
      discount_amount:  0,
      currency:         "NGN",
      channel:          "web",
      requires_delivery: requiresDelivery,
      delivery_address:  deliveryData || undefined,
    });
  };

  // ── render ────────────────────────────────────────────────────────────────

  if (cartLoading && isAuthenticated) {
    return (
      <div className="p-20 text-center font-black italic text-2xl animate-pulse">
        FETCHING YOUR BAG…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FCFAEE] py-12 lg:py-20">

      {/* Loading overlay */}
      {(createOrderMutation.isPending || initializePayment.isPending) && (
        <div className="fixed inset-0 z-[100] bg-primary flex flex-col items-center justify-center text-white p-6">
          <div className="w-24 h-24 border-8 border-white/20 border-t-accent animate-spin mb-8" />
          <h2 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter text-center leading-none">
            Securing Your <br /> Masterpiece<span className="text-accent">.</span>
          </h2>
          <p className="mt-6 font-bold uppercase tracking-[0.3em] text-xs animate-pulse">
            Redirecting to Paystack…
          </p>
        </div>
      )}

      <div className="max-w-[95%] lg:max-w-[85%] mx-auto grid lg:grid-cols-3 gap-12">

        {/* ── Cart items ── */}
        <div className="lg:col-span-2 space-y-8">
          <div className="flex justify-between items-end border-b-4 border-black pb-6">
            <h1 className="text-4xl md:text-7xl font-black uppercase italic tracking-tighter">
              Bag<span className="text-accent">.</span>
            </h1>
            <Link href="/shop" className="text-xs font-black uppercase underline flex items-center gap-2 hover:text-accent transition-colors">
              <ArrowLeft size={14} /> Back to Library
            </Link>
          </div>

          <div className="space-y-4">
            {cartItems.length === 0 ? (
              <div className="py-20 text-center border-4 border-dashed border-black/10">
                <p className="text-2xl font-black uppercase italic opacity-20">Your bag is empty.</p>
                <Link href="/shop">
                  <Button className="mt-4 booka-button-secondary">Go Shopping</Button>
                </Link>
              </div>
            ) : cartItems.map((item) => (
              <div
                key={item.id}
                className="bg-white border-2 border-black p-6 flex flex-col md:flex-row gap-6 items-center gumroad-shadow-sm group"
              >
                <div className="h-32 w-24 relative border-2 border-black shrink-0 overflow-hidden">
                  <Image
                    src={item.book_image}
                    alt={item.book_title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h3 className="text-xl font-black uppercase italic leading-tight">{item.book_title}</h3>
                  <div className="flex items-center justify-center md:justify-start gap-2 mt-1">
                    {isPhysical(item.book_type)
                      ? <Truck size={12} className="text-accent" />
                      : <Download size={12} className="text-accent" />
                    }
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-50">{item.book_type}</p>
                  </div>
                </div>
                <div className="flex items-center border-2 border-black bg-gray-50">
                  <button
                    onClick={() => updateQuantity(item.id, (item.quantity ?? 1) - 1)}
                    disabled={isEbook(item.book_type)}
                    className="px-4 py-2 font-black border-r-2 border-black hover:bg-white disabled:cursor-not-allowed disabled:opacity-40 disabled:bg-black disabled:text-white"
                  >
                    −
                  </button>
                  <span className="px-6 font-black text-sm">
                    {item.quantity ?? 1}
                    {isEbook(item.book_type) ? " (digital)" : ""}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.id, (item.quantity ?? 1) + 1)}
                    disabled={isEbook(item.book_type)}
                    className="px-4 py-2 font-black border-l-2 border-black hover:bg-white disabled:cursor-not-allowed disabled:opacity-40 disabled:bg-black disabled:text-white"
                  >
                    +
                  </button>
                </div>
                <div className="text-right min-w-[100px]">
                  <p className="text-xl font-black italic">
                    ₦{(item.price * (item.quantity ?? 1)).toLocaleString()}
                  </p>
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="text-[10px] font-black uppercase text-destructive hover:underline mt-2 flex items-center gap-1 ml-auto"
                  >
                    <Trash2 size={10} /> Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Order summary ── */}
        <div className="lg:sticky lg:top-28 h-fit">
          <Card className="bg-white border-4 border-black gumroad-shadow p-2 rounded-none">
            <CardContent className="p-6 space-y-6">
              <h3 className="text-xl font-black uppercase italic border-b-2 border-black pb-4">
                Order Summary
              </h3>

              <div className="space-y-3">
                <div className="flex justify-between font-bold uppercase text-xs opacity-50">
                  <span>Subtotal</span>
                  <span>₦{subtotal.toLocaleString()}</span>
                </div>

                {/* Shipping row — shows live cost or a prompt */}
                <div className="flex justify-between font-bold uppercase text-xs">
                  <span className="opacity-50 flex items-center gap-1">
                    Shipping
                    {shippingZone && (
                      <span className="bg-black text-accent text-[8px] font-black px-1.5 py-0.5 tracking-widest">
                        {shippingZone}
                      </span>
                    )}
                  </span>
                  <span className={cn(
                    requiresDelivery ? "text-black" : "text-primary italic",
                  )}>
                    {!requiresDelivery && "Instant Digital"}
                    {requiresDelivery && !selectedState && (
                      <span className="flex items-center gap-1 text-amber-600 animate-pulse">
                        <MapPin size={10} /> Select state
                      </span>
                    )}
                    {requiresDelivery && selectedState && `₦${shipping.toLocaleString()}`}
                  </span>
                </div>

                {/* Helpful hint for physical orders with no state yet */}
                {requiresDelivery && !selectedState && (
                  <p className="text-[9px] font-medium text-gray-400 border-l-2 border-accent pl-2">
                    Enter your delivery state in the shipping form to see the exact cost.
                  </p>
                )}

                <div className="pt-4 border-t-2 border-black flex justify-between items-end">
                  <span className="font-black uppercase text-xs">Total</span>
                  <div className="text-right">
                    <p className="text-4xl font-black italic">₦{total.toLocaleString()}</p>
                    {requiresDelivery && !selectedState && (
                      <p className="text-[9px] text-gray-400 font-medium">+ shipping</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>

            <CardFooter className="p-6 pt-0 flex flex-col gap-4">
              <Button
                onClick={handleCheckout}
                disabled={createOrderMutation.isPending || cartItems.length === 0}
                className="w-full booka-button-primary h-16 text-xl group"
              >
                Checkout <CreditCard className="ml-3 group-hover:rotate-12 transition-transform" />
              </Button>
              <div className="flex items-center justify-center gap-2 opacity-30 text-[8px] font-black uppercase tracking-widest">
                <ShieldCheck size={12} /> Secure Checkout by Paystack
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* ── Guest registration dialog ── */}
      {!isAuthenticated && (
        <Dialog open={showRegistrationDialog} onOpenChange={setShowRegistrationDialog}>
          <DialogContent className="max-w-2xl border-4 border-black rounded-none gumroad-shadow p-0 overflow-hidden flex flex-col max-h-[90vh]">
            <DialogHeader className="p-6 border-b-2 border-black bg-[#FCFAEE]">
              <DialogTitle className="text-2xl font-black uppercase italic tracking-tighter">
                Join Booka to Continue<span className="text-accent">.</span>
              </DialogTitle>
              <DialogDescription className="font-bold text-[10px] uppercase opacity-60">
                Create an account to save your library and proceed to checkout.
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto p-6 bg-white">
              <GuestRegistrationForm
                onSubmit={handleGuestRegistration}
                isLoading={registerGuestMutation.isPending}
              />
            </div>
            <div className="flex gap-4 justify-end p-6 border-t-2 border-black bg-gray-50">
              <Button
                variant="outline"
                onClick={() => setShowRegistrationDialog(false)}
                className="rounded-none border-2 border-black font-black uppercase text-xs h-12 px-6"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="guest-registration-form"
                disabled={registerGuestMutation.isPending}
                className="booka-button-primary h-12 px-8 text-xs"
              >
                {registerGuestMutation.isPending ? "Creating…" : "Create Account & Continue"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Shipping / delivery dialog ── */}
      <Dialog open={showCheckoutDialog} onOpenChange={setShowCheckoutDialog}>
        <DialogContent className="max-w-3xl border-4 border-black rounded-none gumroad-shadow p-0 overflow-hidden flex flex-col max-h-[90vh]">
          <DialogHeader className="p-6 border-b-2 border-black bg-[#FCFAEE]">
            <DialogTitle className="text-2xl font-black uppercase italic tracking-tighter">
              Shipping Details<span className="text-accent">.</span>
            </DialogTitle>
            <DialogDescription className="font-bold text-[10px] uppercase opacity-60">
              Where should we send your physical copies?
            </DialogDescription>
          </DialogHeader>

          {/* Live shipping preview inside dialog */}
          {requiresDelivery && (
            <div className="px-6 pt-4 bg-white">
              <div className="flex items-center justify-between bg-black/[0.03] border-[1.5px] border-black/10 px-4 py-3">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                  <Truck size={12} className="text-accent" />
                  Shipping Cost
                </div>
                <div className="text-right">
                  {selectedState ? (
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-black uppercase tracking-widest opacity-40">
                        {shippingZone} ·{" "}
                        {selectedState
                          .split(" ")
                          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                          .join(" ")}
                      </span>
                      <span className="font-black italic text-lg">
                        ₦{shipping.toLocaleString()}
                      </span>
                    </div>
                  ) : (
                    <span className="text-[10px] font-medium text-amber-600 flex items-center gap-1 animate-pulse">
                      <MapPin size={10} /> Select your state below
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-6 bg-white">
            <DeliveryForm
              onSubmit={handleDeliverySubmit}
              onStateChange={setSelectedState}   // ← live shipping update
              isLoading={createOrderMutation.isPending}
              defaultValues={session?.user?.email ? {
                email:     session.user.email,
                full_name: `${session.user.first_name || ""} ${session.user.last_name || ""}`.trim(),
              } : undefined}
            />
          </div>

          <div className="flex gap-4 justify-end p-6 border-t-2 border-black bg-gray-50">
            <Button
              variant="outline"
              onClick={() => setShowCheckoutDialog(false)}
              className="rounded-none border-2 border-black font-black uppercase text-xs h-12 px-6"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="delivery-form"
              disabled={createOrderMutation.isPending}
              className="booka-button-primary h-12 px-8 text-xs"
            >
              {createOrderMutation.isPending
                ? "Processing…"
                : selectedState
                  ? `Continue — ₦${total.toLocaleString()}`
                  : "Continue to Payment"
              }
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
