"use client";

import { useState, useRef, useEffect, BaseSyntheticEvent, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { 
  Menu, 
  Search, 
  ShoppingCart, 
  LogOut, 
  X, 
  LayoutDashboard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useSession, signOut } from "next-auth/react";
import { trpc } from "@/app/_providers/trpc-provider";
import { cn } from "@/lib/utils";
import { SearchOverlay } from "../shared/SearchOverlay";
import { UserIdentityBadge } from "./UserIdentityBadge";
import { LanguageSwitcher } from "./language-switcher";

function HeaderContent() {
  const pathname = usePathname();
  const { data: session } = useSession();
  
  // States
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  
  const desktopSearchRef = useRef<HTMLDivElement>(null);
  const mobileSearchButtonRef = useRef<HTMLDivElement>(null);
  const mobileSearchPanelRef = useRef<HTMLDivElement>(null);
  const userId = session?.user?.id as string;
  
  const userCart = trpc.getCartsByUser.useQuery(
    { user_id: userId },
    { enabled: !!userId }
  );

  // Close search overlay when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const clickedDesktopSearch =
        desktopSearchRef.current && desktopSearchRef.current.contains(target);
      const clickedMobileSearchButton =
        mobileSearchButtonRef.current && mobileSearchButtonRef.current.contains(target);
      const clickedMobileSearchPanel =
        mobileSearchPanelRef.current && mobileSearchPanelRef.current.contains(target);

      if (!clickedDesktopSearch && !clickedMobileSearchButton && !clickedMobileSearchPanel) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close menu on navigation
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  const logout = async (e?: BaseSyntheticEvent) => {
    e?.preventDefault();
    await signOut({ callbackUrl: "/" });
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b-[1.5px] border-black">
      <div className="max-w-[95%] lg:max-w-[90%] mx-auto px-4 h-20 flex items-center justify-between gap-4 relative">
        
        {/* --- 1. LOGO --- */}
        <Link href="/" className="shrink-0 hover:opacity-80 transition-opacity">
          <Image 
            src="/black-logo.png" 
            alt="Iwacumo Logo" 
            width={140} 
            height={40} 
            priority
            className="h-8 md:h-10 w-auto brightness-0" 
          />
        </Link>

        {/* --- 2. UNIFIED SEARCH BAR --- */}
        <div ref={desktopSearchRef} className="hidden md:flex flex-1 max-w-xl relative group">
          <div className="relative w-full">
            <Input
              className="booka-input-minimal pl-10 md:pl-12 h-10 md:h-12 bg-[#F9F9F9] focus:bg-white text-sm md:text-base"
              placeholder="Search library..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
              type="search"
            />
            <Search className={cn(
              "absolute left-3 md:left-4 top-1/2 -translate-y-1/2 h-4 w-4 md:h-5 md:w-5 transition-colors",
              isSearchOpen ? "text-black" : "text-gray-400"
            )} />
            
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")}
                className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <SearchOverlay 
            query={searchQuery} 
            isOpen={isSearchOpen} 
            onClose={() => setIsSearchOpen(false)} 
          />
        </div>

        {/* --- 3. DESKTOP NAVIGATION --- */}
        <nav className="hidden lg:flex items-center gap-6 font-bold text-xs uppercase tracking-widest">
          <Link href="/shop" className={cn(
            "hover:text-accent transition-colors",
            pathname === "/shop" ? "text-accent" : "text-primary"
          )}>
            Discover
          </Link>

          <LanguageSwitcher compact />
          
          {session && (
            <Link href="/app" className="flex items-center gap-2 hover:text-accent transition-colors">
              <LayoutDashboard size={16} /> Dashboard
            </Link>
          )}

          <div className="h-4 w-[1px] bg-black/10 mx-2" />

          {session && (
            <div className="max-w-[180px]">
              <UserIdentityBadge
                username={session.user.username}
                avatarUrl={session.user.avatar_url}
                firstName={session.user.first_name}
                lastName={session.user.last_name}
                className="gap-2.5"
                avatarClassName="size-9"
                nameClassName="text-[10px]"
              />
            </div>
          )}

          <Link href="/cart" className="relative p-2 group">
            <ShoppingCart className="h-6 w-6 group-hover:scale-110 transition-transform" />
            {userCart.data && userCart.data.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-black text-accent text-[9px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
                {userCart.data.length}
              </span>
            )}
          </Link>

          {!session ? (
            <div className="flex items-center gap-3">
              <Link href="/login">
                <Button variant="ghost" className="font-bold uppercase text-[11px]">Login</Button>
              </Link>
              <Link href="/register">
                <Button className="booka-button-primary h-11 px-6 text-[11px]">Start Selling</Button>
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-2">
               <button 
                onClick={logout} 
                className="p-2 text-gray-400 hover:text-destructive transition-colors group"
                title="Logout"
              >
                <LogOut className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
              </button>
            </div>
          )}
        </nav>

        {/* --- 4. MOBILE ACTIONS --- */}
        <div className="flex items-center gap-3 lg:hidden">
          <div ref={mobileSearchButtonRef} className="relative md:hidden">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="border-[1.5px] border-black rounded-[var(--radius)]"
              onClick={() => {
                setIsSearchOpen((prev) => {
                  const next = !prev;
                  if (!prev) setSearchQuery("");
                  return next;
                });
              }}
            >
              {isSearchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
            </Button>
          </div>

          <Link href="/cart" className="relative p-2">
            <ShoppingCart className="h-6 w-6" />
            {userCart.data && userCart.data.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-black text-accent text-[8px] font-black w-4 h-4 flex items-center justify-center rounded-full border-[1.5px] border-white">
                {userCart.data.length}
              </span>
            )}
          </Link>
          
          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="border-[1.5px] border-black rounded-[var(--radius)]">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:w-[400px] border-l-[1.5px] border-black p-0 bg-background flex flex-col">
              <div className="p-8 border-b-[1.5px] border-black bg-white">
                <div className="space-y-5">
                  <Image 
                      src="/black-logo.png" 
                      alt="Iwacu Logo" 
                      width={120} 
                      height={32} 
                      className="h-8 w-auto brightness-0" 
                    />
                  {session && (
                    <div className="max-w-full border-[1.5px] border-black rounded-[var(--radius)] px-4 py-3">
                      <p className="mb-2 text-[10px] font-black uppercase tracking-widest opacity-35">Signed In</p>
                      <UserIdentityBadge
                        username={session.user.username}
                        avatarUrl={session.user.avatar_url}
                        firstName={session.user.first_name}
                        lastName={session.user.last_name}
                        className="w-full"
                        avatarClassName="size-10"
                        nameClassName="text-[11px]"
                      />
                    </div>
                  )}
                  <div className="pt-1">
                    <LanguageSwitcher />
                  </div>
                </div>
              </div>
              
              <div className="flex-1 p-8 space-y-10 overflow-y-auto">
                <nav className="flex flex-col gap-6 text-3xl font-black uppercase italic">
                  <Link href="/" className="hover:text-accent">Home</Link>
                  <Link href="/shop" className="hover:text-accent">Discover</Link>
                  {session && <Link href="/app" className="hover:text-accent">Dashboard</Link>}
                </nav>

                <div className="space-y-4 pt-10 border-t border-black/5">
                   <p className="text-[10px] font-black uppercase tracking-widest opacity-30">Account</p>
                   {!session ? (
                    <div className="grid gap-4">
                      <Link href="/login" className="w-full">
                        <Button className="w-full booka-button-secondary h-16 text-lg">Login</Button>
                      </Link>
                      <Link href="/register" className="w-full">
                        <Button className="w-full booka-button-primary h-16 text-lg">Join Iwacumo</Button>
                      </Link>
                    </div>
                  ) : (
                    <Button onClick={logout} className="w-full booka-button-secondary h-16 text-lg flex gap-2">
                      <LogOut /> Sign Out
                    </Button>
                  )}
                </div>
              </div>

              <div className="p-8 bg-accent border-t-[1.5px] border-black">
                <p className="text-[10px] font-black uppercase leading-tight italic">
                  Empowering the African creative economy through literature.
                </p>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {isSearchOpen && (
          <div
            ref={mobileSearchPanelRef}
            className="absolute left-1/2 top-full z-[90] mt-3 w-[min(calc(100vw-2rem),22rem)] -translate-x-1/2 bg-white p-3 border-[1.5px] border-black rounded-[var(--radius)] gumroad-shadow-sm md:hidden"
          >
            <div className="relative w-full">
              <Input
                autoFocus
                className="booka-input-minimal pl-10 h-11 bg-[#F9F9F9] focus:bg-white text-sm"
                placeholder="Search library..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchOpen(true);
                }}
                onFocus={() => setIsSearchOpen(true)}
                type="search"
              />
              <Search className={cn(
                "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors",
                isSearchOpen ? "text-black" : "text-gray-400"
              )} />

              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <SearchOverlay
              query={searchQuery}
              isOpen={isSearchOpen}
              onClose={() => setIsSearchOpen(false)}
            />
          </div>
        )}
      </div>
    </header>
  );
}

export default function Header() {
  return (
    <Suspense fallback={<div className="h-20 bg-white border-b-[1.5px] border-black animate-pulse" />}>
      <HeaderContent />
    </Suspense>
  );
}
