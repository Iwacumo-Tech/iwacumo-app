"use client";

import React, { BaseSyntheticEvent, ReactNode, useState } from "react";
import { usePathname } from "next/navigation";
import { FaBars } from "react-icons/fa";
import { signOut } from "next-auth/react";
import { Sidebar }       from "./sidebar";
import { SidebarMobile } from "./sidebar-mobile";
import { ShoppingBag }   from "lucide-react";
import { useCartStore }  from "@/store/use-cart-store";
import { Button }        from "@/components/ui/button";
import { KycGate }       from "@/components/kyc/kyc-gate";

export interface Link {
  name: string;
  url: string;
  icon: ReactNode;
  requiredPermission: string;
}

const PATH_TITLES: Record<string, string> = {
  "/app":                  "Overview",
  "/app/books":            "Library",
  "/app/books/featured":   "Store Curation",
  "/app/admin/featured":   "Global Featured",
  "/app/orders":           "Sales & Orders",
  "/app/customers":        "Your Tribe",
  "/app/payouts":          "Earnings",
  "/app/kyc":              "Publisher Verification",
  "/app/kyc/pending":      "Verification Pending",
  "/app/kyc-reviews":      "KYC Reviews",
  "/app/users":            "Staff",
  "/app/categories":       "Categories",
};

export default function DashboardShell({
  children,
  links = [],
}: {
  links?: Link[];
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname    = usePathname();
  const toggleCart  = useCartStore((state) => state.toggleCart);

  const currentTitle = PATH_TITLES[pathname] || "Dashboard";

  const logout = async (e?: BaseSyntheticEvent) => {
    e?.preventDefault();
    await signOut({ callbackUrl: "/" });
  };

  return (
    <div className="min-h-screen bg-[#F4F4F0] flex overflow-hidden">
      {/* Mobile Drawer */}
      <SidebarMobile
        logout={logout}
        links={links}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:flex lg:fixed lg:inset-y-0 lg:z-50 lg:w-72 lg:flex-col border-r-4 border-black bg-white">
        <Sidebar links={links} logout={logout} setIsOpen={setSidebarOpen} />
      </aside>

      {/* Main Content Area */}
      <div className="lg:pl-72 flex flex-col flex-1 w-full min-h-screen overflow-y-auto">
        <header className="sticky top-0 z-40 bg-white border-b-4 border-black h-20 flex items-center justify-between px-4 md:px-8 shrink-0">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              className="lg:hidden p-2 border-2 border-black bg-accent hover:bg-accent/80"
              onClick={() => setSidebarOpen(true)}
            >
              <FaBars className="w-5 h-5 text-black" />
            </Button>

            <h1 className="text-xl md:text-2xl font-black uppercase italic tracking-tighter truncate text-black">
              {currentTitle}<span className="text-accent">.</span>
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <Button
              onClick={toggleCart}
              className="bg-accent text-black border-2 border-black h-12 px-4 flex items-center gap-3 gumroad-shadow-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
            >
              <ShoppingBag className="w-5 h-5" />
              <span className="hidden sm:inline font-black uppercase text-[10px] tracking-widest">
                Bag
              </span>
            </Button>
          </div>
        </header>

        {/* ── KycGate wraps all page content ───────────────────── */}
        {/* Non-publishers pass straight through with zero overhead. */}
        {/* Publishers are checked once and redirected if not approved. */}
        <main className="p-4 md:p-10 max-w-[1600px] w-full mx-auto">
          <KycGate>{children}</KycGate>
        </main>
      </div>
    </div>
  );
}