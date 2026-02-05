"use client";

import { useState, BaseSyntheticEvent } from "react";
import Link from "next/link";
import { Menu, Search, ShoppingCart, User, LogOut, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useSession, signOut } from "next-auth/react";
import { trpc } from "@/app/_providers/trpc-provider";
import { cn } from "@/lib/utils";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { data: session } = useSession();
  const userId = session?.user?.id as string;
  
  const userCart = trpc.getCartsByUser.useQuery(
    { user_id: userId },
    { enabled: !!userId }
  );

  const logout = async (e?: BaseSyntheticEvent) => {
    e?.preventDefault();
    await signOut({ callbackUrl: "/" });
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-background border-b-4 border-black">
      <div className="max-w-[95%] lg:max-w-[90%] mx-auto px-4 h-20 flex items-center justify-between gap-8">
        
        {/* Logo */}
        <Link href="/" className="text-3xl font-black uppercase italic tracking-tighter shrink-0">
          Booka<span className="text-accent">.</span>
        </Link>

        {/* Desktop Search - Neo-brutalism Style */}
        <div className="hidden md:flex flex-1 max-w-2xl relative group">
          <Input
            className="input-gumroad pl-12 h-12 bg-white"
            placeholder="Search books, authors, or publishers..."
            type="search"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-black transition-colors" />
        </div>

        {/* Desktop Navigation & Actions */}
        <nav className="hidden lg:flex items-center gap-6 font-bold text-sm uppercase">
          <Link href="/shop" className="hover:text-accent transition-colors">Discover</Link>
          {session && (
            <Link href="/app" className="hover:text-accent transition-colors">Dashboard</Link>
          )}
          
          <div className="h-6 w-[2px] bg-black/10 mx-2" />

          {/* Cart Trigger */}
          <Link href="/cart" className="relative p-2 hover:bg-accent/10 transition-colors">
            <ShoppingCart className="h-6 w-6" />
            {userCart.data && userCart.data.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-black text-accent text-[10px] font-black w-5 h-5 flex items-center justify-center border-2 border-black">
                {userCart.data.length}
              </span>
            )}
          </Link>

          {/* Auth State */}
          {!session ? (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost" className="font-bold uppercase text-xs">Login</Button>
              </Link>
              <Link href="/register">
                <Button className="booka-button-primary py-2 px-6 h-10 text-xs">Start Selling</Button>
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <button onClick={logout} className="p-2 hover:text-destructive transition-colors">
                <LogOut className="h-6 w-6" />
              </button>
            </div>
          )}
        </nav>

        {/* Mobile menu trigger */}
        <div className="flex items-center gap-4 lg:hidden">
          <Link href="/cart" className="relative p-2">
            <ShoppingCart className="h-6 w-6" />
          </Link>
          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="border-2 border-black">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:w-[400px] border-l-4 border-black p-0 bg-background">
              <div className="p-8 space-y-8 flex flex-col h-full">
                <p className="text-3xl font-black uppercase italic">Menu<span className="text-accent">.</span></p>
                <nav className="flex flex-col gap-6 text-2xl font-black uppercase">
                  <Link href="/" onClick={() => setIsMenuOpen(false)}>Home</Link>
                  <Link href="/shop" onClick={() => setIsMenuOpen(false)}>Discover</Link>
                  {session && <Link href="/app" onClick={() => setIsMenuOpen(false)}>My Dashboard</Link>}
                </nav>
                <div className="mt-auto space-y-4">
                  {!session ? (
                    <>
                      <Link href="/login" className="block w-full" onClick={() => setIsMenuOpen(false)}>
                        <Button className="w-full booka-button-secondary py-6">Login</Button>
                      </Link>
                      <Link href="/register" className="block w-full" onClick={() => setIsMenuOpen(false)}>
                        <Button className="w-full booka-button-primary py-6">Start Selling</Button>
                      </Link>
                    </>
                  ) : (
                    <Button onClick={logout} className="w-full booka-button-secondary py-6">Logout</Button>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}