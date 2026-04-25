"use client";

import React, { BaseSyntheticEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { FaBars } from "react-icons/fa";
import { signOut, useSession } from "next-auth/react";
import { Sidebar }       from "./sidebar";
import { SidebarMobile } from "./sidebar-mobile";
import { ShoppingBag }   from "lucide-react";
import { useCartStore }  from "@/store/use-cart-store";
import { Button }        from "@/components/ui/button";
import { KycGate }       from "@/components/kyc/kyc-gate";
import { ProfileSwitcher } from "./profile-switcher";

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
  "/app/users":            "Users",
  "/app/categories":       "Categories",
};

const ALWAYS_ALLOWED_PATH_PREFIXES = [
  "/app/kyc",
  "/app/kyc/pending",
  "/app/author/kyc",
  "/app/author/kyc/pending",
  "/app/authors/kyc",
  "/app/authors/kyc/pending",
];

export default function DashboardShell({
  children,
  links = [],
}: {
  links?: Link[];
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname    = usePathname();
  const router      = useRouter();
  const { data: session } = useSession();
  const toggleCart  = useCartStore((state) => state.toggleCart);

  const currentTitle = PATH_TITLES[pathname] || "Dashboard";

  const allowedPrefixes = useMemo(
    () => links.map((link) => link.url).filter((url) => url !== "/app"),
    [links]
  );

  useEffect(() => {
    if (!pathname) return;
    if (pathname === "/app" || pathname === "/app/profile") return;

    const isAlwaysAllowed = ALWAYS_ALLOWED_PATH_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    );

    if (isAlwaysAllowed) return;

    const isAllowed = allowedPrefixes.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    );

    if (!isAllowed) {
      router.replace("/app");
    }
  }, [allowedPrefixes, pathname, router]);

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
        <header className="sticky top-0 z-40 shrink-0 border-b-4 border-black bg-white px-4 py-3 md:h-20 md:px-8 md:py-0">
          <div className="flex min-h-[3.5rem] flex-col justify-center gap-3 md:min-h-0 md:flex-row md:items-center md:justify-between md:gap-4 md:h-full">
            <div className="flex min-w-0 items-center justify-between gap-3 md:flex-1">
              <div className="flex min-w-0 flex-1 items-center gap-3 md:gap-4">
                <Button
                  variant="ghost"
                  className="lg:hidden shrink-0 border-2 border-black bg-accent p-2 hover:bg-accent/80"
                  onClick={() => setSidebarOpen(true)}
                >
                  <FaBars className="h-5 w-5 text-black" />
                </Button>

                <h1 className="min-w-0 truncate pr-2 text-base font-black uppercase italic tracking-tighter text-black sm:text-lg md:pr-0 md:text-2xl">
                  {currentTitle}
                  <span className="text-accent">.</span>
                </h1>
              </div>

              <div className="flex shrink-0 items-center gap-2 md:hidden">
                <Button
                  onClick={toggleCart}
                  className="flex h-11 items-center gap-2 border-2 border-black bg-accent px-3 text-black gumroad-shadow-sm transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none"
                >
                  <ShoppingBag className="h-5 w-5" />
                  <span className="font-black uppercase tracking-widest text-[10px]">
                    Bag
                  </span>
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 md:min-w-0 md:flex-1 md:justify-end md:gap-4">
              {session?.activeProfile ? (
                <div className="min-w-0 flex-1 md:flex-none">
                  <ProfileSwitcher />
                </div>
              ) : (
                <div className="flex-1 md:hidden" />
              )}

              <Button
                onClick={toggleCart}
                className="hidden h-12 items-center gap-3 border-2 border-black bg-accent px-4 text-black gumroad-shadow-sm transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none md:flex"
              >
                <ShoppingBag className="h-5 w-5" />
                <span className="font-black uppercase tracking-widest text-[10px]">
                  Bag
                </span>
              </Button>
            </div>
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
