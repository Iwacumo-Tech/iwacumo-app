"use client";

import { useSession } from "next-auth/react";
import { trpc } from "@/app/_providers/trpc-provider";
import Link from "next/link";
import { 
  BookOpen, Users, DollarSign, ShoppingCart, Building2,
  BarChart3, Star, ExternalLink, Zap, Package, ArrowRight,
  Sparkles, Library, Loader2, RefreshCcw
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function AppPage() {
  const { data: session } = useSession();
  const userId = session?.user?.id as string;
  const userRoles = session?.roles || [];
  const activeProfile = session?.activeProfile;
  const availableProfiles = session?.availableProfiles || [];

  const isSuperAdmin = userRoles.some(r => r.name === "super-admin");
  const isStaff = activeProfile === "staff";
  const isPublisher = activeProfile === "publisher";
  const isAuthor = activeProfile === "author";
  const isCustomer = activeProfile === "reader";
  const hasPendingCreatorUpgrade =
    !session?.user?.email_verified
    && userRoles.some((r) => r.name === "author" || r.name === "publisher")
    && !availableProfiles.some((profile) => profile === "author" || profile === "publisher");
  const activePortalLabel =
    isStaff
      ? "Platform"
      : isPublisher
      ? "Publisher"
      : isAuthor
      ? "Author"
      : isCustomer
      ? "Reader"
      : "Dashboard";
  const activeStatusLabel =
    isStaff
      ? "Command"
      : isPublisher
      ? "Manage"
      : isAuthor
      ? "Create"
      : isCustomer
      ? "Explore"
      : "Pending";

  // Fetch Stats (Scoped by Role)
  const { data: globalStats } = trpc.getGlobalPlatformStats.useQuery(undefined, { enabled: isSuperAdmin && isStaff });
  const { data: publisherStats } = trpc.getPublisherDashboardStats.useQuery({ publisher_id: session?.user.publisher_id || "" }, { enabled: isPublisher });
  const { data: authorStats } = trpc.getAuthorDashboardStats.useQuery({ author_id: session?.user.author_id || "" }, { enabled: isAuthor });
  const {
    data: customerStats,
    isLoading: customerStatsLoading,
    isFetching: customerStatsFetching,
    refetch: refetchCustomerStats,
  } = trpc.getCustomerDashboardStats.useQuery({ user_id: userId }, { enabled: !!isCustomer, refetchOnMount: "always" });

  // Activity stream normalization
  const unifiedActivity = [
    ...(isStaff ? (globalStats?.activity || []) : []),
    ...(isPublisher
      ? (publisherStats?.recentOrders?.map(o => ({ description: `New order by ${o.customer?.name || "Guest"}`, timestamp: o.created_at })) || [])
      : []),
    ...(isAuthor
      ? (authorStats?.recentReviews?.map(r => ({ description: `New review on "${r.book.title}"`, timestamp: r.created_at })) || [])
      : []),
    ...(isCustomer
      ? (customerStats?.recentOrders?.map(o => ({ description: `Purchased "${o.line_items[0]?.book_variant?.book?.title || "a book"}"`, timestamp: o.created_at })) || [])
      : [])
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Stat card — no hover lift, no shadow, no pointer. Thick left stripe signals "data display".
  const StatBox = ({ title, value, icon: Icon, color = "bg-white", loading = false }: any) => (
    <div className={cn(
      "relative border-2 border-black p-6 border-l-[6px] border-l-accent",
      color === "bg-accent" ? "border-l-black bg-accent" : "bg-white",
    )}>
      {/* Ghost icon — decorative only */}
      <Icon className="absolute top-4 right-4 w-5 h-5 opacity-10" />
      <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40 mb-3">{title}</p>
      {loading ? (
        <div className="flex items-center gap-2">
          <Loader2 size={20} className="animate-spin" />
          <span className="text-xs font-black uppercase tracking-widest">Loading</span>
        </div>
      ) : (
        <p className="text-3xl font-black italic tracking-tighter leading-none truncate">{value}</p>
      )}
    </div>
  );

  return (
    <div className="space-y-12">

      {/* 1. Dynamic Header */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b-4 border-primary pb-8">
        <div>
          <h1 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter">
            {activePortalLabel} Portal<span className="text-accent">.</span>
          </h1>
          <p className="font-bold text-xs uppercase opacity-40 tracking-widest mt-2">
            Status: {activeStatusLabel} — {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
          </p>
        </div>
        <Link href="/shop" className="booka-button-secondary h-12 flex items-center gap-3">
           <ExternalLink size={16} /> Visit Market
        </Link>
      </div>

      {/* Overview label */}
      {(isStaff || isPublisher || isAuthor || isCustomer) && (
        <div className="flex items-center gap-3">
          <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-30">Overview</span>
          <div className="flex-1 h-px bg-black/10" />
          {isCustomer && (
            <button
              type="button"
              onClick={() => refetchCustomerStats()}
              disabled={customerStatsFetching}
              className="inline-flex items-center gap-2 border border-black px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] hover:bg-black hover:text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {customerStatsFetching ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <RefreshCcw size={12} />
              )}
              Refresh
            </button>
          )}
        </div>
      )}

      {/* 2. Metric Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

        {/* SUPER ADMIN VIEW */}
        {isStaff && isSuperAdmin && (
          <>
            <StatBox title="Publishers" value={globalStats?.totalTenants || 0} icon={Building2} color="bg-accent" />
            <StatBox title="Global Books" value={globalStats?.totalBooks || 0} icon={BookOpen} />
            <StatBox title="Global GMV" value={`₦${(globalStats?.totalGMV || 0).toLocaleString()}`} icon={BarChart3} />
            <StatBox title="Platform Cut" value={`₦${(globalStats?.platformTotalEarnings || 0).toLocaleString()}`} icon={DollarSign} />
          </>
        )}

        {/* PUBLISHER VIEW */}
        {isPublisher && (
          <>
            <StatBox title="Authors" value={publisherStats?.totalAuthors || 0} icon={Users} color="bg-accent" />
            <StatBox title="Sales" value={publisherStats?.recentOrders?.length || 0} icon={Package} />
            <StatBox title="Net Profit" value={`₦${(publisherStats?.totalEarnings || 0).toLocaleString()}`} icon={DollarSign} />
            <StatBox title="Revenue" value={`₦${(publisherStats?.totalRevenue || 0).toLocaleString()}`} icon={BarChart3} />
          </>
        )}

        {/* AUTHOR VIEW */}
        {isAuthor && (
          <>
            <StatBox title="Published" value={authorStats?.totalBooks || 0} icon={BookOpen} color="bg-[#82d236]" />
            <StatBox title="Reviews" value={authorStats?.recentReviews?.length || 0} icon={Star} />
            <StatBox title="Earnings" value={`₦${(authorStats?.totalEarnings || 0).toLocaleString()}`} icon={DollarSign} />
            <StatBox title="Gross" value={`₦${(authorStats?.totalRevenueGenerated || 0).toLocaleString()}`} icon={BarChart3} />
          </>
        )}

        {/* CUSTOMER VIEW */}
        {isCustomer ? (
          <>
            <StatBox title="Library" value={customerStats?.booksOwned || 0} icon={Library} color="bg-accent" loading={customerStatsLoading} />
            <StatBox title="Spent" value={`₦${(customerStats?.totalSpent || 0).toLocaleString()}`} icon={DollarSign} />
            <StatBox title="Purchases" value={customerStats?.totalPurchases || 0} icon={ShoppingCart} loading={customerStatsLoading} />
            <StatBox title="Recent" value={customerStats?.recentOrders?.length || 0} icon={Package} loading={customerStatsLoading} />
          </>
        ) : (!isAuthor && !isPublisher && !isStaff) && (
          /* GUEST READER VIEW */
          <div className="col-span-full bg-accent border-4 border-primary p-10 gumroad-shadow flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-4 text-center md:text-left">
              <div className="inline-flex items-center gap-2 bg-white px-3 py-1 border-2 border-primary font-black uppercase text-[10px]">
                <Sparkles size={12} className="text-accent" /> New Member
              </div>
              <h2 className="text-4xl font-black uppercase italic tracking-tighter">Your Library is waiting<span className="text-white">.</span></h2>
              <p className="font-bold text-sm max-w-md">You haven't purchased any books yet. Explore the marketplace to start building your digital collection.</p>
            </div>
            <Link href="/shop" className="booka-button-primary h-16 px-10 text-lg flex items-center gap-3">
              Browse Books <ArrowRight size={20} />
            </Link>
          </div>
        )}
      </div>

      {!activeProfile && !hasPendingCreatorUpgrade && (
        <div className="border-4 border-black bg-white p-8 gumroad-shadow">
          <h2 className="text-2xl font-black uppercase italic tracking-tighter">
            Choose a Profile<span className="text-accent">.</span>
          </h2>
          <p className="mt-3 max-w-2xl text-sm font-bold text-black/70">
            Your dashboard is waiting for an active profile. Refresh the page or switch to one of your available profiles to continue.
          </p>
        </div>
      )}

      {hasPendingCreatorUpgrade && (
        <div className="border-4 border-black bg-white p-8 gumroad-shadow">
          <h2 className="text-2xl font-black uppercase italic tracking-tighter">
            Creator Access Pending<span className="text-accent">.</span>
          </h2>
          <p className="mt-3 max-w-2xl text-sm font-bold text-black/70">
            Your creator upgrade has been created, but author or publisher access stays locked until you verify your email. Your Reader Profile is still active meanwhile.
          </p>
        </div>
      )}

      {isCustomer && (
        <div className="border-2 border-black bg-[#f9f6f0] px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            {customerStatsLoading || customerStatsFetching ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <div className="h-2.5 w-2.5 bg-accent border border-black shrink-0" />
            )}
            <p className="text-[10px] font-black uppercase tracking-widest text-black/60">
              {customerStatsLoading
                ? "Loading your reader dashboard..."
                : customerStatsFetching
                ? "Refreshing your reader dashboard..."
                : "Your latest purchases should appear here and in your library once payment is confirmed."}
            </p>
          </div>

          <button
            type="button"
            onClick={() => refetchCustomerStats()}
            disabled={customerStatsFetching}
            className="inline-flex items-center justify-center gap-2 border-[1.5px] border-black bg-white px-4 py-2 text-[10px] font-black uppercase tracking-widest disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {customerStatsFetching ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <RefreshCcw size={14} />
            )}
            Refresh Reader Data
          </button>
        </div>
      )}

      {/* 3. Activity & Next Steps */}
      <div className="grid lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-3">
            <Zap size={16} className="text-accent fill-accent" />
            <h3 className="text-sm font-black uppercase tracking-widest">Pulse Feed</h3>
          </div>
          <div className="space-y-4">
            {customerStatsLoading && isCustomer ? (
              <div className="border-4 border-dashed border-primary/20 p-12 text-center">
                <Loader2 size={24} className="mx-auto animate-spin" />
                <p className="mt-4 font-black uppercase italic opacity-40 text-lg">Loading recent purchases...</p>
              </div>
            ) : unifiedActivity.length > 0 ? (
              <div className="border-2 border-primary bg-white divide-y-2 divide-black/10">
                {unifiedActivity.slice(0, 5).map((item: any, i: number) => (
                  <div key={i} className="px-6 py-4 flex justify-between items-center cursor-default">
                    <div className="flex gap-4 items-center">
                      <div className="w-1.5 h-1.5 bg-accent shrink-0" />
                      <div>
                        <p className="font-black uppercase text-xs italic leading-snug">{item.description}</p>
                        <p className="text-[9px] font-bold opacity-30 uppercase mt-0.5">
                          {new Date(item.timestamp).toLocaleDateString()} · {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border-4 border-dashed border-primary/20 p-20 text-center">
                <p className="font-black uppercase italic opacity-20 text-2xl">Awaiting Activity...</p>
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-4">
          <h3 className="text-sm font-black uppercase tracking-widest">Actions</h3>
          <div className="border-2 border-black bg-primary text-white divide-y divide-white/10">
            {(isPublisher || isAuthor) && (
              <Link href="/app/books" className="flex items-center justify-between px-6 py-4 hover:bg-white/5 transition-colors group">
                <span className="text-xs font-bold uppercase italic">Manage My Catalog</span>
                <ArrowRight size={14} className="opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </Link>
            )}
            {isCustomer && (
              <Link href="/app/books" className="flex items-center justify-between px-6 py-4 hover:bg-white/5 transition-colors group">
                <span className="text-xs font-bold uppercase italic">Open My Library</span>
                <ArrowRight size={14} className="opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </Link>
            )}
            <Link href="/app/profile" className="flex items-center justify-between px-6 py-4 hover:bg-white/5 transition-colors group">
              <span className="text-xs font-bold uppercase italic">Update Identity</span>
              <ArrowRight size={14} className="opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
