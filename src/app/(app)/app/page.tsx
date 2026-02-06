"use client";

import { useSession } from "next-auth/react";
import { trpc } from "@/app/_providers/trpc-provider";
import Link from "next/link";
import { 
  BookOpen, Users, DollarSign, ShoppingCart, Building2,
  BarChart3, Star, ExternalLink, Zap, Package, ArrowRight,
  Sparkles, Library
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function AppPage() {
  const { data: session } = useSession();
  const userId = session?.user?.id as string;
  const userRoles = session?.roles || [];

  const isSuperAdmin = userRoles.some(r => r.name === "super-admin");
  const isPublisher = userRoles.some(r => r.name === "publisher");
  const isAuthor = userRoles.some(r => r.name === "author");
  const isCustomer = session?.user?.isCustomer;

  // Fetch Stats (Scoped by Role)
  const { data: globalStats } = trpc.getGlobalPlatformStats.useQuery(undefined, { enabled: isSuperAdmin });
  const { data: publisherStats } = trpc.getPublisherDashboardStats.useQuery({ publisher_id: session?.user.publisher_id || "" }, { enabled: isPublisher });
  const { data: authorStats } = trpc.getAuthorDashboardStats.useQuery({ author_id: session?.user.author_id || "" }, { enabled: isAuthor });
  const { data: customerStats } = trpc.getCustomerDashboardStats.useQuery({ user_id: userId }, { enabled: !!isCustomer });

  // Activity stream normalization
  const unifiedActivity = [
    ...(globalStats?.activity || []),
    ...(publisherStats?.recentOrders?.map(o => ({ description: `New order by ${o.customer?.name || 'Guest'}`, timestamp: o.created_at })) || []),
    ...(authorStats?.recentReviews?.map(r => ({ description: `New review on "${r.book.title}"`, timestamp: r.created_at })) || []),
    ...(customerStats?.recentOrders?.map(o => ({ description: `Purchased "${o.line_items[0]?.book_variant?.book?.title || 'a book'}"`, timestamp: o.created_at })) || [])
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const StatBox = ({ title, value, icon: Icon, color = "bg-white" }: any) => (
    <div className={cn("border-4 border-primary p-6 gumroad-shadow transition-transform hover:-translate-y-1", color)}>
      <div className="flex justify-between items-start mb-4">
        <Icon className="w-8 h-8 text-primary" />
        <span className="text-[10px] font-black uppercase tracking-widest opacity-40">{title}</span>
      </div>
      <div className="text-3xl font-black italic tracking-tighter text-primary truncate">{value}</div>
    </div>
  );

  return (
    <div className="space-y-12">
      {/* 1. Dynamic Header */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b-4 border-primary pb-8">
        <div>
          <h1 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter">
            {isSuperAdmin ? "Platform" : isPublisher ? "Publisher" : isAuthor ? "Author" : "Reader"} Portal<span className="text-accent">.</span>
          </h1>
          <p className="font-bold text-xs uppercase opacity-40 tracking-widest mt-2">
            Status: {isSuperAdmin ? "Command" : isPublisher ? "Manage" : isAuthor ? "Create" : "Explore"} — {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
          </p>
        </div>
        <Link href="/shop" className="booka-button-secondary h-12 flex items-center gap-3">
           <ExternalLink size={16} /> Visit Market
        </Link>
      </div>

      {/* 2. Intelligent Metric Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {/* SUPER ADMIN VIEW */}
        {isSuperAdmin && (
          <>
            <StatBox title="Publishers" value={globalStats?.totalTenants || 0} icon={Building2} color="bg-accent" />
            <StatBox title="Global Books" value={globalStats?.totalBooks || 0} icon={BookOpen} />
            <StatBox title="Global GMV" value={`₦${(globalStats?.totalGMV || 0).toLocaleString()}`} icon={BarChart3} />
            <StatBox title="Platform Cut" value={`₦${(globalStats?.platformTotalEarnings || 0).toLocaleString()}`} icon={DollarSign} />
          </>
        )}

        {/* PUBLISHER VIEW (Only if not Super Admin, to avoid clutter) */}
        {isPublisher && !isSuperAdmin && (
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

        {/* CUSTOMER VIEW (The converted reader) */}
        {isCustomer ? (
          <>
            <StatBox title="Library" value={customerStats?.booksOwned || 0} icon={Library} color="bg-accent" />
            <StatBox title="Spent" value={`₦${(customerStats?.totalSpent || 0).toLocaleString()}`} icon={DollarSign} />
            <StatBox title="Purchases" value={customerStats?.totalPurchases || 0} icon={ShoppingCart} />
            <StatBox title="Recent" value={customerStats?.recentOrders?.length || 0} icon={Package} />
          </>
        ) : (!isAuthor && !isPublisher && !isSuperAdmin) && (
          /* GUEST READER VIEW (Onboarding State) */
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

      {/* 3. Activity & Next Steps */}
      <div className="grid lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-xl font-black uppercase italic flex items-center gap-3">
            <Zap className="text-accent fill-accent" /> Pulse Feed
          </h3>
          <div className="space-y-4">
            {unifiedActivity.length > 0 ? (
              <div className="border-4 border-primary bg-white gumroad-shadow">
                {unifiedActivity.slice(0, 5).map((item: any, i: number) => (
                   <div key={i} className="p-6 border-b-2 border-primary last:border-0 flex justify-between items-center hover:bg-accent/5 transition-colors group cursor-default">
                      <div className="flex gap-4 items-center">
                        <div className="w-2 h-2 rounded-full bg-accent" />
                        <div>
                          <p className="font-black uppercase text-sm italic">{item.description}</p>
                          <p className="text-[10px] font-bold opacity-40 uppercase">
                            {new Date(item.timestamp).toLocaleDateString()} — {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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

        <aside className="space-y-6">
           <h3 className="text-xl font-black uppercase italic">Actions</h3>
           <div className="bg-primary text-white p-8 gumroad-shadow space-y-6">
              <ul className="space-y-4">
                 {(isPublisher || isAuthor) && (
                  <li>
                    <Link href="/app/books" className="text-sm font-bold uppercase italic hover:text-accent transition-colors flex items-center gap-2">
                      <ArrowRight size={12} /> Manage My Catalog
                    </Link>
                  </li>
                 )}
                 {isCustomer && (
                   <li>
                    <Link href="/app/books" className="text-sm font-bold uppercase italic hover:text-accent transition-colors flex items-center gap-2">
                      <ArrowRight size={12} /> Open My Library
                    </Link>
                  </li>
                 )}
                 <li>
                    <Link href="/app/profile" className="text-sm font-bold uppercase italic hover:text-accent transition-colors flex items-center gap-2">
                      <ArrowRight size={12} /> Update Identity
                    </Link>
                 </li>
              </ul>
           </div>
        </aside>
      </div>
    </div>
  );
}