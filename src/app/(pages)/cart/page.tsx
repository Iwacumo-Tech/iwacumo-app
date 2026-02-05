"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Trash2, ArrowLeft, CreditCard, ShoppingBag, Truck, Download, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { useSession, signIn } from "next-auth/react";
import { trpc } from "@/app/_providers/trpc-provider";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import DeliveryForm from "@/components/checkout/delivery-form";
import GuestRegistrationForm from "@/components/checkout/guest-registration-form";
import { TDeliveryAddressSchema, TCreateCustomerSchema } from "@/server/dtos";
import { GUEST_CART_KEY, notifyCartUpdate } from "@/lib/cart-utils";
import Link from "next/link";

type CartItem = {
  id: string;
  book_image: string;
  book_title: string;
  book_type: string;
  price: number;
  quantity?: number | null | undefined;
  total?: number;
};


export default function CartPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const userId = session?.user?.id as string;
  const isAuthenticated = status === "authenticated";

  // --- QUERIES ---
  const { data: userCartItems, isLoading: cartLoading } = trpc.getCartsByUser.useQuery(
    { user_id: userId },
    { enabled: !!userId && isAuthenticated }
  );

  // --- STATE ---
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [showCheckoutDialog, setShowCheckoutDialog] = useState(false);
  const [showRegistrationDialog, setShowRegistrationDialog] = useState(false);
  const [requiresDelivery, setRequiresDelivery] = useState(false);
  const [registrationPassword, setRegistrationPassword] = useState<string>("");

  // --- EFFECTS ---
  useEffect(() => {
    if (isAuthenticated && userCartItems) {
      setCartItems(userCartItems.map(item => ({
        ...item,
        quantity: item.quantity ?? undefined,
      })));
    } else if (!isAuthenticated) {
      const storedCart = localStorage.getItem(GUEST_CART_KEY);
      if (storedCart) {
        try {
          setCartItems(JSON.parse(storedCart));
        } catch (error) {
          localStorage.removeItem(GUEST_CART_KEY);
        }
      }
    }
  }, [isAuthenticated, userCartItems]);

  useEffect(() => {
    const physical = cartItems?.some(item =>
        item.book_type.toLowerCase().includes("paper") ||
        item.book_type.toLowerCase().includes("hard")
    );
    setRequiresDelivery(physical || false);
  }, [cartItems]);

  useEffect(() => {
  const syncGuestCart = () => {
    if (!isAuthenticated) {
      const stored = localStorage.getItem(GUEST_CART_KEY);
      setCartItems(stored ? JSON.parse(stored) : []);
    }
  };

  window.addEventListener("cart-updated", syncGuestCart);
  return () => window.removeEventListener("cart-updated", syncGuestCart);
}, [isAuthenticated]);

  // --- MUTATIONS: THE 1-2-DONE CHAIN ---

  const initializePayment = trpc.initializePayment.useMutation({
    onSuccess: (data) => {
      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      }
    },
    onError: (err) => {
      toast({ title: "Payment Error", variant: "destructive", description: err.message });
    }
  });

  const createOrderMutation = trpc.createOrderFromCart.useMutation({
    onSuccess: (order) => {
      
      if (!order) {
        toast({ 
          title: "Order Error", 
          variant: "destructive", 
          description: "Order was created but could not be retrieved. Please check your dashboard." 
        });
        return;
      }

      // Now TypeScript knows 'order' definitely exists
      initializePayment.mutate({
        order_id: order.id,
        email: session?.user?.email || (order as any).customer?.user?.email,
        amount: order.total_amount,
        currency: "NGN",
      });

      localStorage.removeItem(GUEST_CART_KEY);
      utils.getCartsByUser.invalidate();
    },
    onError: (err) => {
      toast({ title: "Order Failed", variant: "destructive", description: err.message });
    }
  });

  const registerGuestMutation = trpc.registerGuestAndTransferCart.useMutation({
    onSuccess: async (data) => {
      const username = data.user.username || data.user.email;
      const result = await signIn("credentials", {
        username,
        password: registrationPassword,
        redirect: false, // Keep them on the page to finish the flow
      });

      if (result?.ok) {
        // 1. Clear the password immediately
        setRegistrationPassword("");
        
        // 2. Clear guest cart from disk
        localStorage.removeItem(GUEST_CART_KEY);

        if (update) {
          await update(); 
        }
        
        // 3. CRITICAL: Force a session refresh
        // const newSession = await session.update(); 
        
        // 4. Close the dialog explicitly
        setShowRegistrationDialog(false);

        toast({ title: "Welcome to Booka!", description: "Account created. Finalizing your order..." });

        // 5. Short delay to ensure the UI state (isAuthenticated) has flipped
        setTimeout(() => {
          if (requiresDelivery) {
            setShowCheckoutDialog(true);
          } else {
            proceedWithCheckout();
          }
        }, 800); 
      }
    },
  });

  const deleteCartItemMutation = trpc.deleteCartItem.useMutation({
    onSuccess: () => {
      toast({ title: "Success", description: "Item removed from bag" });
      utils.getCartsByUser.invalidate();
    },
  });

  // --- HANDLERS ---

  const handleDeleteItem = (id: string) => {
    if (confirm("Remove this masterpiece from your bag?")) {
      if (isAuthenticated) {
        deleteCartItemMutation.mutate({ id });
      } else {
        const updatedCart = cartItems.filter((item) => item.id !== id);
        setCartItems(updatedCart);
        localStorage.setItem(GUEST_CART_KEY, JSON.stringify(updatedCart));
        window.dispatchEvent(new Event("cart-updated"));
      }
    }
  };

  const updateQuantity = (id: string, newQty: number) => {
    const qty = Math.max(1, newQty);
    const updated = cartItems.map(item => item.id === id ? { ...item, quantity: qty } : item);
    setCartItems(updated);
    if (!isAuthenticated) {
      localStorage.setItem(GUEST_CART_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event("cart-updated"));
    }
    // Note: Authenticated quantity sync would require a separate mutation
  };

  const handleCheckout = () => {
    if (!cartItems.length) return;
    if (!isAuthenticated) return setShowRegistrationDialog(true);
    if (requiresDelivery) return setShowCheckoutDialog(true);
    proceedWithCheckout();
  };

  const handleGuestRegistration = async (data: TCreateCustomerSchema) => {
    if (data.password) setRegistrationPassword(data.password);
    registerGuestMutation.mutate({
      customer_data: data,
      cart_items: cartItems.map((item) => ({
        book_image: item.book_image,
        book_title: item.book_title,
        book_type: item.book_type,
        price: item.price,
        quantity: item.quantity ?? 1,
        total: (item.quantity ?? 1) * item.price,
      })),
    });
  };

  const handleDeliverySubmit = (data: TDeliveryAddressSchema) => {
    setShowCheckoutDialog(false);
    proceedWithCheckout(data);
  };

  const proceedWithCheckout = (deliveryData?: TDeliveryAddressSchema) => {
    if (!isAuthenticated || !userId) return;
    const shipping = requiresDelivery ? (500 + (cartItems.length * 200)) : 0;
    createOrderMutation.mutate({
      user_id: userId,
      tax_amount: 0,
      shipping_amount: shipping,
      discount_amount: 0,
      currency: "NGN",
      channel: "web",
      requires_delivery: requiresDelivery,
      delivery_address: deliveryData || undefined,
    });
  };

  const subtotal = cartItems?.reduce((sum, item) => sum + item.price * (item.quantity ?? 1), 0);
  const shipping = requiresDelivery ? (500 + (cartItems.length * 200)) : 0;
  const total = subtotal + shipping;

  if (cartLoading && isAuthenticated) return <div className="p-20 text-center font-black italic">FETCHING YOUR BAG...</div>;

  return (
    <div className="min-h-screen bg-[#FCFAEE] py-12 lg:py-20">
      
      {/* 1-2-DONE OPTIMIZED OVERLAY */}
      {(createOrderMutation.isPending || initializePayment.isPending) && (
        <div className="fixed inset-0 z-[100] bg-primary flex flex-col items-center justify-center text-white p-6">
          <div className="w-24 h-24 border-8 border-white/20 border-t-accent animate-spin mb-8" />
          <h2 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter text-center leading-none">
            Securing Your <br /> Masterpiece<span className="text-accent">.</span>
          </h2>
          <p className="mt-6 font-bold uppercase tracking-[0.3em] text-xs animate-pulse">Redirecting to Paystack...</p>
        </div>
      )}

      <div className="max-w-[95%] lg:max-w-[85%] mx-auto grid lg:grid-cols-3 gap-12">
        
        {/* LIST OF ITEMS */}
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
                <Link href="/shop"><Button className="mt-4 booka-button-secondary">Go Shopping</Button></Link>
              </div>
            ) : cartItems.map((item) => (
              <div key={item.id} className="bg-white border-2 border-black p-6 flex flex-col md:flex-row gap-6 items-center gumroad-shadow-sm group">
                <div className="h-32 w-24 relative border-2 border-black shrink-0 overflow-hidden">
                  <Image src={item.book_image} alt={item.book_title} fill className="object-cover group-hover:scale-105 transition-transform" />
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h3 className="text-xl font-black uppercase italic leading-tight">{item.book_title}</h3>
                  <div className="flex items-center justify-center md:justify-start gap-2 mt-1">
                    {item.book_type.toLowerCase().includes("paper") ? <Truck size={12} className="text-accent" /> : <Download size={12} className="text-accent" />}
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-50">{item.book_type}</p>
                  </div>
                </div>
                <div className="flex items-center border-2 border-black bg-gray-50">
                    <button onClick={() => updateQuantity(item.id, (item.quantity ?? 1) - 1)} className="px-4 py-2 font-black border-r-2 border-black hover:bg-white">-</button>
                    <span className="px-6 font-black text-sm">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, (item.quantity ?? 1) + 1)} className="px-4 py-2 font-black border-l-2 border-black hover:bg-white">+</button>
                </div>
                <div className="text-right min-w-[100px]">
                    <p className="text-xl font-black italic">₦{(item.price * (item.quantity ?? 1)).toLocaleString()}</p>
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

        {/* STICKY SUMMARY */}
        <div className="lg:sticky lg:top-28 h-fit">
          <Card className="bg-white border-4 border-black gumroad-shadow p-2 rounded-none">
            <CardContent className="p-6 space-y-6">
              <h3 className="text-xl font-black uppercase italic border-b-2 border-black pb-4">Order Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between font-bold uppercase text-xs opacity-50">
                  <span>Subtotal</span>
                  <span>₦{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-bold uppercase text-xs">
                  <span className="opacity-50">Shipping</span>
                  <span className={cn(requiresDelivery ? "text-black" : "text-primary italic")}>
                    {requiresDelivery ? `₦${shipping.toLocaleString()}` : "Instant Digital"}
                  </span>
                </div>
                <div className="pt-4 border-t-2 border-black flex justify-between items-end">
                  <span className="font-black uppercase text-xs">Total</span>
                  <span className="text-4xl font-black italic">₦{total.toLocaleString()}</span>
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

      {/* DIALOGS */}
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
            <Button variant="outline" onClick={() => setShowRegistrationDialog(false)} className="rounded-none border-2 border-black font-black uppercase text-xs h-12 px-6">Cancel</Button>
            <Button type="submit" form="guest-registration-form" disabled={registerGuestMutation.isPending} className="booka-button-primary h-12 px-8 text-xs">
                {registerGuestMutation.isPending ? "Creating..." : "Create Account & Continue"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      )}

      <Dialog open={showCheckoutDialog} onOpenChange={setShowCheckoutDialog}>
        <DialogContent className="max-w-3xl border-4 border-black rounded-none gumroad-shadow p-0 overflow-hidden flex flex-col max-h-[90vh]">
          <DialogHeader className="p-6 border-b-2 border-black bg-[#FCFAEE]">
            <DialogTitle className="text-2xl font-black uppercase italic tracking-tighter">
              Shipping Details<span className="text-accent">.</span>
            </DialogTitle>
            <DialogDescription className="font-bold text-[10px] uppercase opacity-60">Where should we send your physical copies?</DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 bg-white">
            <DeliveryForm
              onSubmit={handleDeliverySubmit}
              isLoading={createOrderMutation.isPending}
              defaultValues={session?.user?.email ? {
                  email: session.user.email,
                  full_name: `${session.user.first_name || ""} ${session.user.last_name || ""}`.trim(),
              } : undefined}
            />
          </div>

          <div className="flex gap-4 justify-end p-6 border-t-2 border-black bg-gray-50">
            <Button variant="outline" onClick={() => setShowCheckoutDialog(false)} className="rounded-none border-2 border-black font-black uppercase text-xs h-12 px-6">Cancel</Button>
            <Button type="submit" form="delivery-form" disabled={createOrderMutation.isPending} className="booka-button-primary h-12 px-8 text-xs">
                {createOrderMutation.isPending ? "Processing..." : "Continue to Payment"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}