"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
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
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { useSession } from "next-auth/react";
import { trpc } from "@/app/_providers/trpc-provider";
type CartItem = {
  id: string;
  book_image: string;
  book_title: string;
  book_type: string;
  price: number;
  quantity?: number | undefined;
};

export default function CartPage() {
  const session = useSession();
  const { data: userCartItems } = trpc.getCartsByUser.useQuery({
    user_id: session.data?.user.id as string,
  });

  console.log(userCartItems);
  const [cartItems, setCartItems] = useState(userCartItems || []);

  const updateQuantity = (id: string, quantity: number) => {
    setCartItems((items) =>
      items?.map((item) =>
        item.id === id ? { ...item, quantity: Math.max(1, quantity) } : item
      )
    );
  };

  const subtotal = cartItems?.reduce(
    (sum, item) => sum + item.price * (item.quantity ?? 1),
    0
  );
  const shipping = 0;
  const total = subtotal + shipping;

  useEffect(() => {
    if (userCartItems) {
      setCartItems(userCartItems);
    }
  }, [userCartItems]);

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
                    <Button variant="ghost" size="icon">
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

          {/* Removed UPDATE CART button */}
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
                  <span className="text-[#82d236]">₦{shipping.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold">
                  <span>Grand Total</span>
                  <span className="text-[#82d236]">₦{total.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex-col gap-2 p-6">
              {/* Removed Update Cart button */}
              <Button className="w-full bg-[#82d236] hover:bg-[#72bc2d]">
                CHECKOUT
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
