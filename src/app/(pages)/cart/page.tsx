"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Trash2, ArrowLeft, CreditCard, Truck, Download,
  ShieldCheck, MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { useSession, signIn } from "next-auth/react";
import { trpc } from "@/app/_providers/trpc-provider";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import DeliveryForm from "@/components/checkout/delivery-form";
import GuestRegistrationForm from "@/components/checkout/guest-registration-form";
import { TDeliveryAddressSchema, TCreateCustomerSchema } from "@/server/dtos";
import { GUEST_CART_KEY } from "@/lib/cart-utils";
import {
  calcShippingCostForProvider,
  DEFAULT_FEZ_SHIPPING_RATES,
  DEFAULT_SHIPPING_PROVIDER_OPTIONS,
  DEFAULT_SPEEDAF_SHIPPING_RATES,
  FezShippingRates,
  ShippingProvider,
  ShippingProviderOptions,
  SHIPPING_PROVIDERS,
  SpeedafShippingRates,
} from "@/lib/constants";
import Link from "next/link";
import {
  convertBaseAmount,
  DEFAULT_CURRENCY_SETTINGS,
  DEFAULT_PAYMENT_GATEWAY_SETTINGS,
  formatMoney,
  getAvailablePaymentGateways,
  hasValidCheckoutCurrencyRate,
  normalizeCurrencySettings,
  normalizePaymentGatewaySettings,
  PaymentGateway,
} from "@/lib/payment-config";

type CartItem = {
  id: string;
  book_image: string;
  book_title: string;
  book_type: string;
  price: number;
  quantity?: number | null;
  total?: number;
};

const SHIPPING_PROVIDER_LABELS: Record<ShippingProvider, string> = {
  speedaf: "Speedaf",
  fez: "Fez",
};

const DEFAULT_WEIGHT_GRAMS_PER_ITEM = 400;

function isPhysical(bookType: string) {
  const t = bookType.toLowerCase();
  return t.includes("paper") || t.includes("hard");
}

function isEbook(bookType: string) {
  return bookType.toLowerCase().includes("ebook");
}

export default function CartPage() {
  const { data: session, status, update } = useSession();
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const router = useRouter();

  const userId = session?.user?.id as string;
  const isAuthenticated = status === "authenticated";

  const { data: userCartItems, isLoading: cartLoading } =
    trpc.getCartsByUser.useQuery(
      { user_id: userId },
      { enabled: !!userId && isAuthenticated }
    );

  const { data: systemSettings } = trpc.getSystemSettings.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [showCheckoutDialog, setShowCheckoutDialog] = useState(false);
  const [showRegistrationDialog, setShowRegistrationDialog] = useState(false);
  const [requiresDelivery, setRequiresDelivery] = useState(false);
  const [registrationPassword, setRegistrationPassword] = useState("");
  const [selectedState, setSelectedState] = useState<string>("");
  const [selectedShippingProvider, setSelectedShippingProvider] = useState<ShippingProvider | null>(null);
  const [selectedCheckoutCurrency, setSelectedCheckoutCurrency] = useState<string>("");
  const [selectedPaymentGateway, setSelectedPaymentGateway] = useState<PaymentGateway | null>(null);

  useEffect(() => {
    if (isAuthenticated && userCartItems) {
      setCartItems(userCartItems.map(item => ({ ...item, quantity: item.quantity ?? undefined })));
    } else if (!isAuthenticated) {
      const stored = localStorage.getItem(GUEST_CART_KEY);
      if (stored) {
        try {
          setCartItems(JSON.parse(stored));
        } catch {
          localStorage.removeItem(GUEST_CART_KEY);
        }
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

  const estimatedWeightGrams = useMemo(() => {
    const physicalItems = cartItems.filter(item => isPhysical(item.book_type));
    return physicalItems.reduce(
      (sum, item) => sum + DEFAULT_WEIGHT_GRAMS_PER_ITEM * (item.quantity ?? 1),
      0
    );
  }, [cartItems]);

  const shippingProviderOptions = (systemSettings?.shipping_provider_options as ShippingProviderOptions | undefined)
    ?? DEFAULT_SHIPPING_PROVIDER_OPTIONS;
  const speedafRates = (systemSettings?.shipping_rates as SpeedafShippingRates | undefined)
    ?? DEFAULT_SPEEDAF_SHIPPING_RATES;
  const fezRates = (systemSettings?.fez_shipping_rates as FezShippingRates | undefined)
    ?? DEFAULT_FEZ_SHIPPING_RATES;
  const currencySettings = normalizeCurrencySettings(
    (systemSettings as any)?.currency_settings ?? DEFAULT_CURRENCY_SETTINGS
  );
  const paymentGatewaySettings = normalizePaymentGatewaySettings(
    (systemSettings as any)?.payment_gateway_settings ?? DEFAULT_PAYMENT_GATEWAY_SETTINGS
  );
  const paymentGatewayHealth = ((systemSettings as any)?.payment_gateway_health ?? {}) as Record<string, any>;

  const enabledShippingProviders = useMemo(
    () =>
      (Object.entries(shippingProviderOptions) as Array<[ShippingProvider, { enabled: boolean }]>)
        .filter(([, config]) => config?.enabled)
        .map(([provider]) => provider),
    [shippingProviderOptions]
  );

  useEffect(() => {
    if (!requiresDelivery) {
      setSelectedShippingProvider(null);
      return;
    }

    if (!enabledShippingProviders.length) {
      setSelectedShippingProvider(null);
      return;
    }

    if (selectedShippingProvider && enabledShippingProviders.includes(selectedShippingProvider)) {
      return;
    }

    if (enabledShippingProviders.length === 1) {
      setSelectedShippingProvider(enabledShippingProviders[0]);
      return;
    }

    setSelectedShippingProvider(null);
  }, [enabledShippingProviders, requiresDelivery, selectedShippingProvider]);

  useEffect(() => {
    if (!selectedCheckoutCurrency) {
      setSelectedCheckoutCurrency(currencySettings.default_checkout_currency);
      return;
    }

    if (!currencySettings.supported_checkout_currencies.includes(selectedCheckoutCurrency)) {
      setSelectedCheckoutCurrency(currencySettings.default_checkout_currency);
    }
  }, [
    currencySettings.default_checkout_currency,
    currencySettings.supported_checkout_currencies,
    selectedCheckoutCurrency,
  ]);

  const shippingQuotes = useMemo(() => {
    if (!requiresDelivery || !selectedState || estimatedWeightGrams <= 0) {
      return [] as Array<{ provider: ShippingProvider; label: string; amount: number }>;
    }

    return enabledShippingProviders.map((provider) =>
      calcShippingCostForProvider({
        provider,
        state: selectedState,
        weightGrams: estimatedWeightGrams,
        speedafRates,
        fezRates,
      })
    );
  }, [enabledShippingProviders, estimatedWeightGrams, fezRates, requiresDelivery, selectedState, speedafRates]);

  const activeShippingQuote = shippingQuotes.find(
    (quote) => quote.provider === selectedShippingProvider
  ) ?? null;
  const shipping = activeShippingQuote?.amount ?? 0;
  const shippingLabel = activeShippingQuote?.label ?? null;

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * (item.quantity ?? 1), 0);
  const total = subtotal + shipping;
  const isFreeCheckout = total <= 0;

  const hasValidCheckoutRate = useMemo(() => {
    return hasValidCheckoutCurrencyRate(
      selectedCheckoutCurrency || currencySettings.default_checkout_currency,
      currencySettings
    );
  }, [
    currencySettings,
    currencySettings.default_checkout_currency,
    selectedCheckoutCurrency,
  ]);

  const availablePaymentGateways = useMemo(() => {
    if (!hasValidCheckoutRate) return [];

    return getAvailablePaymentGateways({
      currency: selectedCheckoutCurrency || currencySettings.default_checkout_currency,
      settings: paymentGatewaySettings,
      health: paymentGatewayHealth as any,
    });
  }, [
    hasValidCheckoutRate,
    currencySettings.default_checkout_currency,
    paymentGatewayHealth,
    paymentGatewaySettings,
    selectedCheckoutCurrency,
  ]);

  useEffect(() => {
    const matchingGateway = availablePaymentGateways.find((gateway) =>
      gateway.gateway === selectedPaymentGateway
    );

    if (matchingGateway) return;

    if (availablePaymentGateways.length === 1) {
      setSelectedPaymentGateway(availablePaymentGateways[0].gateway);
      return;
    }

    setSelectedPaymentGateway(null);
  }, [availablePaymentGateways, selectedPaymentGateway]);

  const selectedPaymentOption = availablePaymentGateways.find((gateway) =>
    gateway.gateway === selectedPaymentGateway
  ) ?? null;

  const checkoutSubtotal = convertBaseAmount(
    subtotal,
    selectedCheckoutCurrency || currencySettings.default_checkout_currency,
    currencySettings
  );
  const checkoutShipping = convertBaseAmount(
    shipping,
    selectedCheckoutCurrency || currencySettings.default_checkout_currency,
    currencySettings
  );
  const checkoutTotal = convertBaseAmount(
    total,
    selectedCheckoutCurrency || currencySettings.default_checkout_currency,
    currencySettings
  );

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

      localStorage.removeItem(GUEST_CART_KEY);
      utils.getCartsByUser.invalidate();

      if (order.payment_status === "captured" || order.total_amount <= 0) {
        toast({ title: "Book added to your library", description: "Your free order is complete." });
        router.push(`/orders/${order.id}`);
        return;
      }

      initializePayment.mutate({
        order_id: order.id,
        email: session?.user?.email || (order as any).customer?.user?.email,
        payment_gateway: (order as any).payment_gateway || selectedPaymentGateway || undefined,
      });
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
      const result = await signIn("credentials", { username, password: registrationPassword, redirect: false });
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

  const getShippingQuoteForState = (state: string, provider: ShippingProvider | null) => {
    if (!provider || !state || estimatedWeightGrams <= 0) return null;
    return calcShippingCostForProvider({
      provider,
      state,
      weightGrams: estimatedWeightGrams,
      speedafRates,
      fezRates,
    });
  };

  const handleCheckout = () => {
    if (!cartItems.length) return;
    if (!isAuthenticated) return setShowRegistrationDialog(true);

    if (!hasValidCheckoutRate) {
      toast({
        title: "Invalid currency rate",
        variant: "destructive",
        description: `Please configure a valid NGN conversion rate for ${selectedCheckoutCurrency || currencySettings.default_checkout_currency} before continuing.`,
      });
      return;
    }

    if (!isFreeCheckout && !selectedPaymentOption) {
      toast({
        title: "Payment gateway unavailable",
        variant: "destructive",
        description: "Choose a supported checkout currency and payment gateway before continuing.",
      });
      return;
    }

    if (requiresDelivery && !enabledShippingProviders.length) {
      toast({
        title: "Shipping unavailable",
        variant: "destructive",
        description: "No shipping provider is enabled right now for physical delivery.",
      });
      return;
    }

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
        book_type: item.book_type,
        price: item.price,
        quantity: item.quantity ?? 1,
        total: (item.quantity ?? 1) * item.price,
      })),
    });
  };

  const handleDeliverySubmit = (data: TDeliveryAddressSchema) => {
    if (data.state) setSelectedState(data.state);
    if (!selectedShippingProvider) {
      toast({
        title: "Select a shipping provider",
        variant: "destructive",
        description: "Choose one of the available couriers before continuing.",
      });
      return;
    }
    setShowCheckoutDialog(false);
    proceedWithCheckout(data);
  };

  const proceedWithCheckout = (deliveryData?: TDeliveryAddressSchema) => {
    if (!isAuthenticated || !userId) return;
    if (!isFreeCheckout && !selectedPaymentOption) return;

    const stateForShipping = deliveryData?.state || selectedState;
    const shippingQuote = requiresDelivery
      ? getShippingQuoteForState(stateForShipping, selectedShippingProvider)
      : null;
    const finalShipping = shippingQuote?.amount ?? 0;

    createOrderMutation.mutate({
      user_id: userId,
      tax_amount: 0,
      shipping_amount: finalShipping,
      discount_amount: 0,
      currency: currencySettings.base_currency,
      checkout_currency: selectedCheckoutCurrency || currencySettings.default_checkout_currency,
      payment_gateway: selectedPaymentOption?.gateway,
      channel: "web",
      shipping_provider: selectedShippingProvider ?? undefined,
      requires_delivery: requiresDelivery,
      delivery_address: deliveryData || undefined,
    });
  };

  if (cartLoading && isAuthenticated) {
    return (
      <div className="p-20 text-center font-black italic text-2xl animate-pulse">
        FETCHING YOUR BAG…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FCFAEE] py-12 lg:py-20">
      {(createOrderMutation.isPending || initializePayment.isPending) && (
        <div className="fixed inset-0 z-[100] bg-primary flex flex-col items-center justify-center text-white p-6">
          <div className="w-24 h-24 border-8 border-white/20 border-t-accent animate-spin mb-8" />
          <h2 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter text-center leading-none">
            Securing Your <br /> Masterpiece<span className="text-accent">.</span>
          </h2>
          <p className="mt-6 font-bold uppercase tracking-[0.3em] text-xs animate-pulse">
            Redirecting to {selectedPaymentOption?.gateway_label || "checkout"}…
          </p>
        </div>
      )}

      <div className="max-w-[95%] lg:max-w-[85%] mx-auto grid lg:grid-cols-3 gap-12">
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
                <div className="text-right min-w-[120px]">
                  <p className="text-xl font-black italic">
                    {formatMoney(item.price * (item.quantity ?? 1), currencySettings.base_currency)}
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

        <div className="lg:sticky lg:top-28 h-fit">
          <Card className="bg-white border-4 border-black gumroad-shadow p-2 rounded-none">
            <CardContent className="p-6 space-y-6">
              <h3 className="text-xl font-black uppercase italic border-b-2 border-black pb-4">
                Order Summary
              </h3>

              <div className="space-y-4">
                <div>
                  <p className="font-black uppercase text-[10px] opacity-50 mb-2">Checkout Currency</p>
                  <div className="grid grid-cols-2 gap-2">
                    {currencySettings.supported_checkout_currencies.map((currencyCode) => (
                      <button
                        key={currencyCode}
                        type="button"
                        onClick={() => setSelectedCheckoutCurrency(currencyCode)}
                        className={cn(
                          "border-2 border-black px-3 py-2 text-xs font-black uppercase transition-colors",
                          selectedCheckoutCurrency === currencyCode ? "bg-accent" : "bg-white hover:bg-black/5"
                        )}
                      >
                        {currencyCode}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="font-black uppercase text-[10px] opacity-50 mb-2">Payment Option</p>
                  <div className="space-y-2">
                    {isFreeCheckout ? (
                      <div className="border-2 border-black bg-[#FCFAEE] px-4 py-3 text-[10px] font-black uppercase tracking-widest text-black">
                        No payment required for this order.
                      </div>
                    ) : !hasValidCheckoutRate ? (
                      <div className="border-2 border-red-500 bg-red-50 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-red-700">
                        Set a valid NGN rate for {selectedCheckoutCurrency || currencySettings.default_checkout_currency} before enabling checkout.
                      </div>
                    ) : availablePaymentGateways.length > 0 ? availablePaymentGateways.map((gatewayOption) => {
                      const selected = gatewayOption.gateway === selectedPaymentGateway;

                      return (
                        <button
                          key={gatewayOption.gateway}
                          type="button"
                          onClick={() => setSelectedPaymentGateway(gatewayOption.gateway)}
                          className={cn(
                            "w-full border-2 border-black px-4 py-3 text-left transition-colors",
                            selected ? "bg-accent" : "bg-white hover:bg-black/5"
                          )}
                        >
                          <p className="text-sm font-black uppercase italic">{gatewayOption.gateway_label}</p>
                          <p className="text-[10px] font-bold uppercase tracking-widest opacity-50">
                            Choose your method on the gateway page
                          </p>
                        </button>
                      );
                    }) : (
                      <div className="border-2 border-red-500 bg-red-50 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-red-700">
                        No gateway available for {selectedCheckoutCurrency || currencySettings.default_checkout_currency}.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between font-bold uppercase text-xs opacity-50">
                  <span>Subtotal</span>
                  <span>{formatMoney(checkoutSubtotal, selectedCheckoutCurrency || currencySettings.default_checkout_currency)}</span>
                </div>

                <div className="flex justify-between font-bold uppercase text-xs">
                  <span className="opacity-50 flex items-center gap-1">
                    Shipping
                    {shippingLabel && (
                      <span className="bg-black text-accent text-[8px] font-black px-1.5 py-0.5 tracking-widest">
                        {shippingLabel}
                      </span>
                    )}
                  </span>
                  <span className={cn(requiresDelivery ? "text-black" : "text-primary italic")}>
                    {!requiresDelivery && "Instant Digital"}
                    {requiresDelivery && !selectedState && (
                      <span className="flex items-center gap-1 text-amber-600 animate-pulse">
                        <MapPin size={10} /> Select state
                      </span>
                    )}
                    {requiresDelivery && selectedState && !enabledShippingProviders.length && "No courier available"}
                    {requiresDelivery && selectedState && enabledShippingProviders.length > 0 && !selectedShippingProvider && "Choose courier"}
                    {requiresDelivery && selectedState && selectedShippingProvider && `${SHIPPING_PROVIDER_LABELS[selectedShippingProvider]} · ${formatMoney(checkoutShipping, selectedCheckoutCurrency || currencySettings.default_checkout_currency)}`}
                  </span>
                </div>

                {requiresDelivery && !selectedState && (
                  <p className="text-[9px] font-medium text-gray-400 border-l-2 border-accent pl-2">
                    Enter your delivery state in the shipping form to see the exact cost.
                  </p>
                )}
                {requiresDelivery && selectedState && enabledShippingProviders.length === 0 && (
                  <p className="text-[9px] font-medium text-red-600 border-l-2 border-red-500 pl-2">
                    No shipping provider is enabled right now for physical checkout.
                  </p>
                )}
                {requiresDelivery && selectedState && enabledShippingProviders.length > 1 && !selectedShippingProvider && (
                  <p className="text-[9px] font-medium text-amber-600 border-l-2 border-amber-500 pl-2">
                    Choose a courier in the shipping dialog to continue.
                  </p>
                )}

                <div className="pt-4 border-t-2 border-black flex justify-between items-end">
                  <span className="font-black uppercase text-xs">Total</span>
                  <div className="text-right">
                    <p className="text-4xl font-black italic">
                      {formatMoney(checkoutTotal, selectedCheckoutCurrency || currencySettings.default_checkout_currency)}
                    </p>
                    <p className="text-[9px] text-gray-400 font-medium">
                      Base {formatMoney(total, currencySettings.base_currency)}
                    </p>
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
              <div className="flex items-center justify-center gap-2 opacity-30 text-[8px] font-black uppercase tracking-widest text-center">
                <ShieldCheck size={12} />
                {isFreeCheckout ? "No payment gateway required" : `Secure Checkout by ${selectedPaymentOption?.gateway_label || "Configured Gateway"}`}
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>

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

          {requiresDelivery && (
            <div className="px-6 pt-4 bg-white">
              <div className="flex items-center justify-between bg-black/[0.03] border-[1.5px] border-black/10 px-4 py-3">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                  <Truck size={12} className="text-accent" />
                  Shipping Cost
                </div>
                <div className="text-right">
                  {selectedState && selectedShippingProvider && activeShippingQuote ? (
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-black uppercase tracking-widest opacity-40">
                        {SHIPPING_PROVIDER_LABELS[selectedShippingProvider]} · {shippingLabel} ·{" "}
                        {selectedState
                          .split(" ")
                          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                          .join(" ")}
                      </span>
                      <span className="font-black italic text-lg">
                        {formatMoney(checkoutShipping, selectedCheckoutCurrency || currencySettings.default_checkout_currency)}
                      </span>
                    </div>
                  ) : selectedState && enabledShippingProviders.length === 0 ? (
                    <span className="text-[10px] font-medium text-red-600 flex items-center gap-1">
                      <MapPin size={10} /> No courier available
                    </span>
                  ) : selectedState ? (
                    <span className="text-[10px] font-medium text-amber-600 flex items-center gap-1 animate-pulse">
                      <Truck size={10} /> Choose a courier below
                    </span>
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
            {requiresDelivery && (
              <div className="mb-6 space-y-3">
                <h3 className="text-sm font-black uppercase tracking-widest">Choose Courier</h3>
                <div className="grid gap-3">
                  {enabledShippingProviders.map((provider) => {
                    const quote = shippingQuotes.find((item) => item.provider === provider);
                    const isSelected = selectedShippingProvider === provider;

                    return (
                      <button
                        key={provider}
                        type="button"
                        onClick={() => setSelectedShippingProvider(provider)}
                        disabled={!selectedState}
                        className={cn(
                          "flex items-center justify-between border-2 border-black px-4 py-3 text-left transition-colors",
                          isSelected ? "bg-accent" : "bg-white hover:bg-black/5",
                          !selectedState && "opacity-60 cursor-not-allowed"
                        )}
                      >
                        <div>
                          <p className="text-sm font-black uppercase italic">
                            {SHIPPING_PROVIDER_LABELS[provider]}
                          </p>
                          <p className="text-[10px] font-bold uppercase tracking-widest opacity-50">
                            {quote?.label ?? "Select state first"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black">
                            {quote ? formatMoney(
                              convertBaseAmount(
                                quote.amount,
                                selectedCheckoutCurrency || currencySettings.default_checkout_currency,
                                currencySettings
                              ),
                              selectedCheckoutCurrency || currencySettings.default_checkout_currency
                            ) : "Pending"}
                          </p>
                        </div>
                      </button>
                    );
                  })}

                  {enabledShippingProviders.length === 0 && (
                    <div className="border-2 border-red-500 bg-red-50 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-red-700">
                      No shipping provider is enabled right now.
                    </div>
                  )}
                </div>
              </div>
            )}

            <DeliveryForm
              onSubmit={handleDeliverySubmit}
              onStateChange={setSelectedState}
              isLoading={createOrderMutation.isPending}
              defaultValues={session?.user?.email ? {
                email: session.user.email,
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
              disabled={createOrderMutation.isPending || !selectedShippingProvider || enabledShippingProviders.length === 0}
              className="booka-button-primary h-12 px-8 text-xs"
            >
              {createOrderMutation.isPending
                ? "Processing…"
                : selectedState && selectedShippingProvider
                  ? `Continue — ${formatMoney(checkoutTotal, selectedCheckoutCurrency || currencySettings.default_checkout_currency)}`
                  : selectedState && enabledShippingProviders.length === 0
                    ? "Shipping Unavailable"
                    : "Continue to Payment"
              }
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
