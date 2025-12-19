"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import DeliveryForm from "@/components/checkout/delivery-form";
import GuestRegistrationForm from "@/components/checkout/guest-registration-form";
import { TDeliveryAddressSchema, TCreateCustomerSchema } from "@/server/dtos";

type CartItem = {
  id: string;
  book_image: string;
  book_title: string;
  book_type: string;
  price: number;
  quantity?: number | null | undefined;
  total?: number;
};

const GUEST_CART_KEY = "guest_cart_items";

export default function CartPage() {
  const session = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const userId = session.data?.user.id as string;
  const isAuthenticated = !!userId;

  // Fetch user cart items if authenticated
  const { data: userCartItems, isLoading: cartLoading } = trpc.getCartsByUser.useQuery({
    user_id: userId,
  }, {
    enabled: !!userId,
  });

  // State for cart items (from DB or localStorage)
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [showCheckoutDialog, setShowCheckoutDialog] = useState(false);
  const [showRegistrationDialog, setShowRegistrationDialog] = useState(false);
  const [deliveryInfo, setDeliveryInfo] = useState<TDeliveryAddressSchema | null>(null);
  const [requiresDelivery, setRequiresDelivery] = useState(false);

  // Load cart items from localStorage for guests or from DB for authenticated users
  useEffect(() => {
    if (isAuthenticated && userCartItems) {
      // Convert null quantities to undefined for consistency
      const normalizedCartItems = userCartItems.map(item => ({
        ...item,
        quantity: item.quantity ?? undefined,
      }));
      setCartItems(normalizedCartItems);
    } else if (!isAuthenticated) {
      // Load from localStorage for guests
      const storedCart = localStorage.getItem(GUEST_CART_KEY);
      if (storedCart) {
        try {
          const parsedCart = JSON.parse(storedCart);
          setCartItems(parsedCart);
        } catch (error) {
          console.error("Failed to parse cart from localStorage:", error);
          localStorage.removeItem(GUEST_CART_KEY);
        }
      }
    }
  }, [isAuthenticated, userCartItems]);

  // Save guest cart to localStorage whenever it changes
  useEffect(() => {
    if (!isAuthenticated && cartItems.length > 0) {
      localStorage.setItem(GUEST_CART_KEY, JSON.stringify(cartItems));
    } else if (isAuthenticated && cartItems.length === 0) {
      // Clear localStorage when user logs in
      localStorage.removeItem(GUEST_CART_KEY);
    }
  }, [cartItems, isAuthenticated]);

  // Check if cart contains physical items (paperback or hardcover)
  useEffect(() => {
    const hasPhysicalItems = cartItems?.some(
      (item) =>
        item.book_type.toLowerCase().includes("paper") ||
        item.book_type.toLowerCase().includes("hard") ||
        item.book_type === "Paper-back" ||
        item.book_type === "Hard-cover"
    );
    setRequiresDelivery(hasPhysicalItems || false);
  }, [cartItems]);

  // Register guest and transfer cart mutation
  const registerGuestMutation = trpc.registerGuestAndTransferCart.useMutation({
    onSuccess: async (data) => {
      // Sign in the newly created user using username or email
      const username = data.user.username || data.user.email;
      const result = await signIn("credentials", {
        username: username,
        password: registrationPassword,
        redirect: false,
      });

      // Clear password from memory
      setRegistrationPassword("");

      if (result?.ok) {
        // Clear localStorage
        localStorage.removeItem(GUEST_CART_KEY);
        
        toast({
          title: "Success",
          variant: "default",
          description: "Account created successfully! Proceeding to checkout...",
        });

        // Refresh session
        await session.update();
        setShowRegistrationDialog(false);
        
        // Wait a bit for session to update, then proceed with checkout
        setTimeout(() => {
          if (requiresDelivery) {
            setShowCheckoutDialog(true);
          } else {
            proceedWithCheckout();
          }
        }, 1000);
      } else {
        toast({
          title: "Account Created",
          variant: "default",
          description: "Account created successfully. Please log in to continue.",
        });
        router.push("/login");
      }
    },
    onError: (error) => {
      setRegistrationPassword("");
      toast({
        title: "Registration Failed",
        variant: "destructive",
        description: error.message || "Failed to create account. Please try again.",
      });
    },
  });

  // Delete cart item mutation
  const deleteCartItemMutation = trpc.deleteCartItem.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        variant: "default",
        description: "Item removed from cart",
      });
      if (isAuthenticated) {
        utils.getCartsByUser.invalidate({ user_id: userId });
      } else {
        // Remove from localStorage
        const updatedCart = cartItems.filter((item) => item.id !== deleteCartItemMutation.variables?.id);
        setCartItems(updatedCart);
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        variant: "destructive",
        description: error.message || "Failed to remove item from cart",
      });
    },
  });

  // Create order from cart mutation
  const createOrderMutation = trpc.createOrderFromCart.useMutation({
    onSuccess: (order) => {
      toast({
        title: "Success",
        variant: "default",
        description: `Order ${order?.order_number} created successfully!`,
      });
      // Invalidate cart query to refresh the cart
      if (isAuthenticated) {
        utils.getCartsByUser.invalidate({ user_id: userId });
      }
      // Redirect to order details page
      router.push(`/orders/${order?.id}`);
    },
    onError: (error) => {
      toast({
        title: "Checkout Failed",
        variant: "destructive",
        description: error.message || "Failed to create order. Please try again.",
      });
    },
  });

  const handleDeleteItem = (id: string) => {
    if (confirm("Are you sure you want to remove this item from your cart?")) {
      if (isAuthenticated) {
        deleteCartItemMutation.mutate({ id });
      } else {
        // Remove from localStorage
        const updatedCart = cartItems.filter((item) => item.id !== id);
        setCartItems(updatedCart);
        toast({
          title: "Success",
          variant: "default",
          description: "Item removed from cart",
        });
      }
    }
  };

  const handleCheckout = () => {
    if (!cartItems || cartItems.length === 0) {
      toast({
        title: "Cart is Empty",
        variant: "destructive",
        description: "Please add items to your cart before checkout",
      });
      return;
    }

    // If user is not authenticated, show registration form
    if (!isAuthenticated) {
      setShowRegistrationDialog(true);
      return;
    }

    // If cart contains physical items, show delivery form
    if (requiresDelivery) {
      setShowCheckoutDialog(true);
      return;
    }

    // For digital-only orders, proceed directly
    proceedWithCheckout();
  };

  const [registrationPassword, setRegistrationPassword] = useState<string>("");

  const handleGuestRegistration = async (data: TCreateCustomerSchema) => {
    // Store password temporarily for sign-in (will be cleared after use)
    if (data.password) {
      setRegistrationPassword(data.password);
    }
    
    // Prepare cart items for transfer
    const cartItemsForTransfer = cartItems.map((item) => ({
      book_image: item.book_image,
      book_title: item.book_title,
      book_type: item.book_type,
      price: item.price,
      quantity: item.quantity ?? 1,
      total: item.total ?? item.price * (item.quantity ?? 1),
    }));

    registerGuestMutation.mutate({
      customer_data: data,
      cart_items: cartItemsForTransfer,
    });
  };

  const handleDeliverySubmit = (data: TDeliveryAddressSchema) => {
    setDeliveryInfo(data);
    setShowCheckoutDialog(false);
    proceedWithCheckout(data);
  };

  const proceedWithCheckout = (deliveryData?: TDeliveryAddressSchema) => {
    if (!isAuthenticated || !userId) return;

    // Calculate shipping amount if delivery is required
    const shippingAmount = requiresDelivery ? calculateShipping() : 0;

    // Create order from cart
    createOrderMutation.mutate({
      user_id: userId,
      tax_amount: 0, // Can be calculated based on location
      shipping_amount: shippingAmount,
      discount_amount: 0, // Can be applied if there are discount codes
      currency: "NGN", // Or get from user preferences
      channel: "web",
      requires_delivery: requiresDelivery,
      delivery_address: deliveryData || undefined,
      notes: deliveryData
        ? JSON.stringify({
            delivery_address: deliveryData,
            delivery_required: true,
          })
        : undefined,
    });
  };

  const calculateShipping = (): number => {
    // Simple shipping calculation - can be enhanced based on location, weight, etc.
    // For now, return a fixed amount or calculate based on number of physical items
    const physicalItemCount = cartItems?.filter(
      (item) =>
        item.book_type.toLowerCase().includes("paper") ||
        item.book_type.toLowerCase().includes("hard") ||
        item.book_type === "Paper-back" ||
        item.book_type === "Hard-cover"
    ).length || 0;

    // Base shipping + per item cost
    return 500 + physicalItemCount * 200; // ₦500 base + ₦200 per item
  };

  const updateQuantity = (id: string, quantity: number) => {
    const newQuantity = Math.max(1, quantity);
    if (isAuthenticated) {
      // For authenticated users, update in DB (would need an update mutation)
      setCartItems((items) =>
        items?.map((item) =>
          item.id === id ? { ...item, quantity: newQuantity } : item
        )
      );
    } else {
      // For guests, update in localStorage
      setCartItems((items) =>
        items?.map((item) =>
          item.id === id ? { ...item, quantity: newQuantity, total: item.price * newQuantity } : item
        )
      );
    }
  };

  const subtotal = cartItems?.reduce(
    (sum, item) => sum + item.price * (item.quantity ?? 1),
    0
  );
  const shipping = requiresDelivery ? calculateShipping() : 0;
  const total = subtotal + shipping;

  if (cartLoading && isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading cart...</div>
      </div>
    );
  }

  if (!cartItems || cartItems.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-8">Shopping Cart</h1>
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">Your cart is empty</p>
          <Button
            onClick={() => router.push("/shop")}
            className="bg-[#82d236] hover:bg-[#72bc2d]"
          >
            Continue Shopping
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">Shopping Cart</h1>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead className="w-[100px]">IMAGE</TableHead>
                <TableHead>PRODUCT</TableHead>
                <TableHead>PRICE</TableHead>
                <TableHead>QUANTITY</TableHead>
                <TableHead>TOTAL</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cartItems?.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteItem(item.id)}
                      disabled={deleteCartItemMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                  <TableCell>
                    <div className="relative w-20 h-20">
                      <Image
                        src={item.book_image}
                        alt={item.book_title}
                        fill
                        className="object-cover"
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    {item.book_title} - {item.book_type}
                  </TableCell>
                  <TableCell>₦{item.price.toFixed(2)}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity as number}
                      onChange={(e) =>
                        updateQuantity(item.id, parseInt(e.target.value))
                      }
                      className="w-20"
                    />
                  </TableCell>
                  <TableCell>
                    ₦{(item.price * (item.quantity ?? 1) || 0).toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="lg:col-span-1">
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-6">Cart Summary</h2>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span>Sub Total</span>
                  <span className="text-[#82d236]">
                    ₦{subtotal?.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping Cost</span>
                  <span className="text-[#82d236]">
                    {requiresDelivery ? `₦${shipping.toFixed(2)}` : "Free"}
                  </span>
                </div>
                {requiresDelivery && (
                  <p className="text-xs text-gray-500 mt-2">
                    * Delivery information required for physical items
                  </p>
                )}
                <div className="flex justify-between text-lg font-bold">
                  <span>Grand Total</span>
                  <span className="text-[#82d236]">₦{total.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex-col gap-2 p-6">
              <Button
                className="w-full bg-[#82d236] hover:bg-[#72bc2d]"
                onClick={handleCheckout}
                disabled={
                  createOrderMutation.isPending ||
                  registerGuestMutation.isPending ||
                  !cartItems ||
                  cartItems.length === 0
                }
              >
                {createOrderMutation.isPending || registerGuestMutation.isPending
                  ? "Processing..."
                  : "CHECKOUT"}
              </Button>
              {!isAuthenticated && (
                <p className="text-xs text-gray-500 text-center mt-2">
                  You'll be asked to create an account to complete checkout
                </p>
              )}
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* Guest Registration Dialog */}
      <Dialog open={showRegistrationDialog} onOpenChange={setShowRegistrationDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Account to Continue</DialogTitle>
            <DialogDescription>
              Please create an account to proceed with checkout. Your cart items will be saved.
            </DialogDescription>
          </DialogHeader>
          <GuestRegistrationForm
            onSubmit={handleGuestRegistration}
            isLoading={registerGuestMutation.isPending}
          />
          <div className="flex gap-2 justify-end mt-4 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setShowRegistrationDialog(false)}
              disabled={registerGuestMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="guest-registration-form"
              disabled={registerGuestMutation.isPending}
              className="bg-[#82d236] hover:bg-[#72bc2d]"
            >
              {registerGuestMutation.isPending ? "Creating Account..." : "Create Account & Continue"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Checkout Dialog with Delivery Form */}
      <Dialog open={showCheckoutDialog} onOpenChange={setShowCheckoutDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Complete Your Order</DialogTitle>
            <DialogDescription>
              Please provide delivery information for your physical items
            </DialogDescription>
          </DialogHeader>
          <DeliveryForm
            onSubmit={handleDeliverySubmit}
            isLoading={createOrderMutation.isPending}
            defaultValues={
              session.data?.user?.email
                ? {
                    email: session.data.user.email,
                    full_name: session.data.user.first_name || "",
                  }
                : undefined
            }
          />
          <div className="flex gap-2 justify-end mt-4 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setShowCheckoutDialog(false)}
              disabled={createOrderMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="delivery-form"
              disabled={createOrderMutation.isPending}
              className="bg-[#82d236] hover:bg-[#72bc2d]"
            >
              {createOrderMutation.isPending ? "Processing..." : "Continue to Payment"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
