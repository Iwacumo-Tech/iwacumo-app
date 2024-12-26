"use client";

import { useState, BaseSyntheticEvent } from "react";
import Link from "next/link";
import { Headphones, Menu, Search, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useSession, signOut } from "next-auth/react";
import { trpc } from "@/app/_providers/trpc-provider";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const session = useSession();
  const userCart = trpc.getCartsByUser.useQuery({
    user_id: session.data?.user.id as string,
  });

  const logoutRedirectTo = "/";

  const logout = async (e?: BaseSyntheticEvent) => {
    e?.preventDefault();
    await signOut({ callbackUrl: logoutRedirectTo ?? "/" });
  };

  return (
    <header className="border-b">
      {/* Centered Content Container */}
      <div className="max-w-[80%] mx-auto px-4 md:px-6">
        {/* Top Bar */}
        <div className="flex items-center justify-between py-4">
          {/* Logo */}
          <Link
            href="/"
            className="text-2xl md:text-3xl font-bold text-green-600"
          >
            Booka.
          </Link>

          {/* Search Bar - Hidden on mobile, visible on larger screens */}
          <div className="hidden md:flex w-[400px] lg:w-[600px]">
            <Input
              className="rounded-r-none"
              placeholder="Search entire store here"
              type="search"
            />
            <Button className="rounded-l-none bg-green-600 hover:bg-green-700">
              <Search className="h-4 w-4" />
              <span className="ml-2 hidden sm:inline">Search</span>
            </Button>
          </div>

          {/* Auth & Cart - Hidden on mobile, visible on larger screens */}
          <div className="hidden md:flex items-center gap-4">
            {!session.data && (
              <div className="text-sm">
                <Link href="/login" className="hover:text-green-600">
                  Login
                </Link>
                <span className="mx-2">or</span>
                <Link href="/register" className="hover:text-green-600">
                  Register
                </Link>
              </div>
            )}
            {session.data && (
              <div className="text-sm">
                <p
                  className="hover:text-green-600 cursor-pointer"
                  onClick={logout}
                >
                  Logout
                </p>
              </div>
            )}
            <Link className="cursor-pointer" href="/cart">
              <div className="flex items-center gap-2 relative">
                <ShoppingCart className="h-5 w-5" />
                {userCart.data && (
                  <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {userCart.data.length}
                  </span>
                )}
              </div>
            </Link>
          </div>

          {/* Mobile Menu Trigger */}
          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] sm:w-[400px]">
              <nav className="flex flex-col gap-4">
                <Link
                  href="/"
                  className="text-lg font-semibold hover:text-green-600"
                  onClick={() => setIsMenuOpen(false)}
                >
                  HOME
                </Link>
                <Link
                  href="/shop"
                  className="text-lg font-semibold hover:text-green-600"
                  onClick={() => setIsMenuOpen(false)}
                >
                  SHOP
                </Link>
                <Link
                  href="/pages"
                  className="text-lg font-semibold hover:text-green-600"
                  onClick={() => setIsMenuOpen(false)}
                >
                  PAGES
                </Link>
                <Link
                  href="/blog"
                  className="text-lg font-semibold hover:text-green-600"
                  onClick={() => setIsMenuOpen(false)}
                >
                  BLOG
                </Link>
                <Link
                  href="/contact"
                  className="text-lg font-semibold hover:text-green-600"
                  onClick={() => setIsMenuOpen(false)}
                >
                  CONTACT
                </Link>
              </nav>
              <div className="mt-auto pt-4 border-t">
                <Link
                  href="/login"
                  className="block py-2 hover:text-green-600"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="block py-2 hover:text-green-600"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Register
                </Link>
                <div className="flex items-center gap-2 py-2">
                  <ShoppingCart className="h-5 w-5" />
                  <div>
                    <span className="text-sm text-muted-foreground">
                      Shopping Cart
                    </span>
                    <p className="font-medium">£0.00</p>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Mobile Search - Visible only on mobile */}
        <div className="md:hidden pb-4">
          <div className="flex w-full">
            <Input
              className="rounded-r-none"
              placeholder="Search entire store here"
              type="search"
            />
            <Button className="rounded-l-none bg-green-600 hover:bg-green-700">
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Full-width Green Div */}
      <div className="w-full bg-green-600">
        <div className="max-w-[80%] mx-auto px-4 md:px-6 flex items-center justify-between py-3 text-white">
          {/* Support */}
          <div className="flex items-center">
            <Headphones className="h-5 w-5 mr-2" />
            <div>
              <div className="text-sm">Free Support 24/7</div>
              <div className="font-medium">+01-202-555-0181</div>
            </div>
          </div>

          {/* Main Navigation - Hidden on mobile, visible on larger screens */}
          <nav className="hidden md:flex items-center gap-4">
            <Link href="/" className="hover:text-green-100">
              HOME
            </Link>
            <Link href="/shop" className="hover:text-green-100">
              SHOP
            </Link>
            {session.data && (
              <Link href="/app" className="hover:text-green-100">
                DASHBOARD
              </Link>
            )}

            <Link href="/blog" className="hover:text-green-100">
              BLOG
            </Link>
            <Link href="/contact" className="hover:text-green-100">
              CONTACT
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
