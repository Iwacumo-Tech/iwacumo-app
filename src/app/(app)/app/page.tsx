"use client";

import { useSession } from "next-auth/react";
import { trpc } from "@/app/_providers/trpc-provider";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/table/data-table";
import { deliveryColumns } from "@/components/deliveries/delivery-columns";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, Users, DollarSign, ShoppingCart, BarChart3, Star, ExternalLink } from "lucide-react";

export default function AppPage() {
  const session = useSession();
  const userId = session.data?.user.id as string;
  const userRoles = session.data?.roles || [];

  // Role detection
  const isSuperAdmin = userRoles.some(r => r.name === "super-admin");
  const isTenantAdmin = userRoles.some(r => r.name === "admin" || r.name === "tenant-admin");
  const isPublisher = userRoles.some(r => r.name === "publisher");
  const isAuthor = userRoles.some(r => r.name === "author");
  const isCustomer = userRoles.some(r => r.name === "customer");

  // Fetch role-specific data
  const { data: globalStats, isLoading: globalLoading } = trpc.getGlobalPlatformStats.useQuery(undefined, { enabled: isSuperAdmin });
  const { data: publisherStats, isLoading: pubLoading } = trpc.getPublisherDashboardStats.useQuery({ publisher_id: session.data?.user.publisher_id || "" }, { enabled: isPublisher });
  const { data: authorStats, isLoading: authorLoading } = trpc.getAuthorDashboardStats.useQuery({ author_id: session.data?.user.author_id || "" }, { enabled: isAuthor });
  
  // Existing customer logic preserved
  const { data: purchasedBooks, isLoading: booksLoading } = trpc.getPurchasedBooksByCustomer.useQuery(
    { id: userId },
    { enabled: !!userId && isCustomer }
  );

  const { data: deliveries, isLoading: deliveriesLoading } = trpc.getDeliveriesByCustomer.useQuery(
    { user_id: userId },
    { enabled: !!userId && isCustomer }
  );

  // Helper for stats cards
  const StatCard = ({ title, value, icon: Icon, subtitle }: any) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="w-4 h-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </CardContent>
    </Card>
  );

  if (isCustomer && !isPublisher && !isAuthor && !isSuperAdmin) {
    return (
      <div className="p-6 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              {isCustomer && !isPublisher && !isAuthor && !isSuperAdmin 
                ? `Welcome back, ${session.data?.user.first_name}!` 
                : `Hello, ${session.data?.user.first_name}`}
            </h1>
            <p className="text-muted-foreground">
              {isCustomer ? "Your digital library and tracking" : "Management Overview"}
            </p>
          </div>
            
            {/* Visit Store Link */}
            <Link 
              href="/" 
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors w-fit shadow-sm"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="font-medium">Visit Store</span>
            </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard title="My Books" value={purchasedBooks?.length || 0} icon={BookOpen} />
          <StatCard title="Active Deliveries" value={deliveries?.filter(d => d.status !== 'delivered').length || 0} icon={ShoppingCart} />
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-4">My Books</h2>
          {booksLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="aspect-[4/5] w-full rounded-lg" />)}
            </div>
          ) : purchasedBooks && purchasedBooks.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {purchasedBooks.map((book) => (
                <Link key={book.id} href={`/app/books/view/${book.id}`}>
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full group">
                    <div className="relative aspect-[4/5] w-full overflow-hidden rounded-t-lg">
                      <Image
                        src={book.book_cover || book.cover_image_url || "/bookcover.png"}
                        alt={book.title}
                        fill
                        className="object-cover transition-transform group-hover:scale-105"
                      />
                    </div>
                    <CardHeader className="p-3 pb-0 space-y-1">
                      <p className="text-xs text-muted-foreground truncate">{book.author?.name || "Unknown Author"}</p>
                      <h3 className="font-semibold leading-tight text-sm line-clamp-2">{book.title}</h3>
                    </CardHeader>
                    <CardContent className="p-3 pt-2">
                       <div className="text-[10px] bg-primary/10 text-primary w-fit px-2 py-0.5 rounded">Digital Copy</div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 border-2 border-dashed rounded-xl">
              <p className="text-muted-foreground mb-4">You haven't purchased any books yet.</p>
              <Link href="/shop" className="inline-block px-6 py-2 bg-primary text-white rounded-md">Browse Catalog</Link>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Dashboard for Staff (Admin/Publisher/Author)
  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Hello, {session.data?.user.first_name}</h1>
        <p className="text-muted-foreground">Management Overview</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isSuperAdmin && (
          <>
            <StatCard title="Total Tenants" value={globalStats?.totalTenants || 0} icon={Users} />
            <StatCard title="Total GMV" value={`₦${(globalStats?.totalGMV || 0).toLocaleString()}`} icon={BarChart3} />
            <StatCard title="Platform Fees" value={`₦${(globalStats?.platformTotalEarnings || 0).toLocaleString()}`} icon={DollarSign} />
            <StatCard title="Success Orders" value={globalStats?.successfulOrders || 0} icon={ShoppingCart} />
          </>
        )}
        {isPublisher && !isSuperAdmin && (
          <>
            <StatCard title="Total Authors" value={publisherStats?.totalAuthors || 0} icon={Users} />
            <StatCard title="Books in Catalog" value={publisherStats?.totalBooks || 0} icon={BookOpen} />
            <StatCard title="Net Earnings" value={`₦${(publisherStats?.totalEarnings || 0).toLocaleString()}`} icon={DollarSign} />
            <StatCard title="Total Revenue" value={`₦${(publisherStats?.totalRevenue || 0).toLocaleString()}`} icon={BarChart3} />
          </>
        )}
        {isAuthor && !isPublisher && !isSuperAdmin && (
          <>
            <StatCard title="My Books" value={authorStats?.totalBooks || 0} icon={BookOpen} />
            <StatCard title="Accrued Royalties" value={`₦${(authorStats?.totalEarnings || 0).toLocaleString()}`} icon={DollarSign} />
            <StatCard title="Generated Revenue" value={`₦${(authorStats?.totalRevenueGenerated || 0).toLocaleString()}`} icon={BarChart3} />
          </>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {isAuthor && authorStats?.recentReviews && authorStats.recentReviews.length > 0 ? (
            <div className="space-y-4">
              {authorStats.recentReviews.map((review) => (
                <div key={review.id} className="flex items-start gap-4 p-3 border rounded-lg">
                  <div className="bg-yellow-100 p-2 rounded-full">
                    <Star className="w-4 h-4 text-yellow-600 fill-yellow-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">New Review on <span className="text-primary">{review.book.title}</span></p>
                    <p className="text-xs text-muted-foreground mt-1 italic">"{review.comment}"</p>
                    <div className="flex items-center gap-1 mt-2">
                       {Array.from({ length: 5 }).map((_, i) => (
                         <Star key={i} className={`w-3 h-3 ${i < review.rating ? "fill-yellow-500 text-yellow-500" : "text-gray-300"}`} />
                       ))}
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(review.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No recent activity to show.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}