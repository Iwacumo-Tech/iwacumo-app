"use client";

import { useSession } from "next-auth/react";
import { trpc } from "@/app/_providers/trpc-provider";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DataTable } from "@/components/table/data-table";
import { deliveryColumns } from "@/components/deliveries/delivery-columns";

export default function AppPage() {
  const session = useSession();
  const userId = session.data?.user.id as string;
  
  // Check if user is a customer
  const isCustomer = session.data?.roles.some((role) => role.name === "customer");
  
  // Get purchased books for customers
  const { data: purchasedBooks, isLoading: booksLoading } = trpc.getPurchasedBooksByCustomer.useQuery(
    { id: userId },
    { enabled: !!userId && isCustomer }
  );

  // Get deliveries for customers
  const { data: deliveries, isLoading: deliveriesLoading } = trpc.getDeliveriesByCustomer.useQuery(
    { user_id: userId },
    { enabled: !!userId && isCustomer }
  );

  if (isCustomer) {
    return (
      <div className="p-6 space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">
            Welcome back, {session.data?.user.first_name}!
          </h1>
          <p className="text-muted-foreground">Your purchased books</p>
        </div>

        {/* Purchased Books Section */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">My Books</h2>
          {booksLoading ? (
            <div className="text-center py-8">Loading your books...</div>
          ) : purchasedBooks && purchasedBooks.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {purchasedBooks.map((book) => (
                <Link key={book.id} href={`/app/books/view/${book.id}`}>
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                    <div className="relative aspect-[4/5] w-full">
                      <Image
                        src={book.book_cover || book.cover_image_url || "/bookcover.png"}
                        alt={book.title}
                        fill
                        className="object-cover rounded-t-lg"
                      />
                    </div>
                    <CardHeader className="p-3 pb-0">
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {book.author?.name || book.primary_author?.name || "Unknown Author"}
                      </p>
                      <h3 className="font-semibold leading-tight text-sm line-clamp-2">
                        {book.title}
                      </h3>
                    </CardHeader>
                    <CardContent className="p-3 pt-2">
                      {book.subtitle && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                          {book.subtitle}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg mb-4">
                You haven't purchased any books yet.
              </p>
              <Link
                href="/shop"
                className="inline-block px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                Browse Books
              </Link>
            </div>
          )}
        </div>

        {/* Delivery Tracking Section */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">Delivery Tracking</h2>
          {deliveriesLoading ? (
            <div className="text-center py-8">Loading deliveries...</div>
          ) : deliveries && deliveries.length > 0 ? (
            <DataTable
              data={deliveries}
              columns={deliveryColumns}
              filterInputPlaceholder="Search by order number or tracking number..."
              filterColumnId="order.order_number"
              action={null}
            />
          ) : (
            <div className="text-center py-8 border rounded-lg">
              <p className="text-muted-foreground">
                No deliveries to track yet.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // For non-customers, show the original simple greeting
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-2">
        Hello {session.data?.user.first_name}
      </h1>
      <p className="text-muted-foreground">Welcome to your dashboard</p>
    </div>
  );
}
