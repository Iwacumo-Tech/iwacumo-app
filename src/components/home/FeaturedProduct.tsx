"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { trpc } from "@/app/_providers/trpc-provider";

export default function ProductTabs() {
  const featuredBooks = trpc.getAllFeaturedBooks.useQuery();
  const newBooks = trpc.getNewArrivalBooks.useQuery();

  return (
    <div className="max-w-[80%] mx-auto px-4 py-8 md:py-12">
      <Tabs defaultValue="featured" className="w-full">
        <TabsList className="w-full h-auto flex flex-wrap gap-2 bg-transparent border-b">
          <TabsTrigger
            value="featured"
            className={cn(
              "data-[state=active]:bg-transparent data-[state=active]:shadow-none",
              "px-6 py-3 rounded-none border border-transparent",
              "data-[state=active]:border-[#82d236] data-[state=active]:text-[#82d236]",
              "data-[state=active]:relative after:absolute after:bottom-0 after:left-1/2",
              "after:transform after:-translate-x-1/2 after:translate-y-[100%]",
              "after:border-8 after:border-transparent",
              "data-[state=active]:after:border-t-[#82d236]"
            )}
          >
            Featured Products
          </TabsTrigger>
          <TabsTrigger
            value="new"
            className={cn(
              "data-[state=active]:bg-transparent data-[state=active]:shadow-none",
              "px-6 py-3 rounded-none border border-transparent",
              "data-[state=active]:border-[#82d236] data-[state=active]:text-[#82d236]",
              "data-[state=active]:relative after:absolute after:bottom-0 after:left-1/2",
              "after:transform after:-translate-x-1/2 after:translate-y-[100%]",
              "after:border-8 after:border-transparent",
              "data-[state=active]:after:border-t-[#82d236]"
            )}
          >
            New Arrivals
          </TabsTrigger>
        </TabsList>

        {/* Featured Products Tab */}
        <TabsContent value="featured" className="mt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {featuredBooks.isLoading && (
              <p className="text-center col-span-full">Loading...</p>
            )}
            {featuredBooks.isError && (
              <p className="text-center col-span-full text-red-500">
                Error loading featured books.
              </p>
            )}
            {featuredBooks.data && featuredBooks.data.length > 0 ? (
              featuredBooks.data.map((book: any) => (
                <ProductCard key={book.id} book={book} />
              ))
            ) : (
              <p className="text-center col-span-full">
                No featured books to display.
              </p>
            )}
          </div>
        </TabsContent>

        {/* New Arrivals Tab */}
        <TabsContent value="new" className="mt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {newBooks.isLoading && (
              <p className="text-center col-span-full">Loading...</p>
            )}
            {newBooks.isError && (
              <p className="text-center col-span-full text-red-500">
                Error loading new books.
              </p>
            )}
            {newBooks.data && newBooks.data.length > 0 ? (
              newBooks.data.map((book: any) => (
                <ProductCard key={book.id} book={book} />
              ))
            ) : (
              <p className="text-center col-span-full">
                No new books to display.
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ProductCard({ book }: { book: any }) {
  if (!book) {
    return (
      <Card className="border-none shadow-none">
        <CardContent className="p-0 space-y-3 text-center">
          <p>No data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-none">
      <CardContent className="p-0 space-y-3">
        <div className="relative aspect-[3/4] bg-gray-100">
          <Image
            src={book.book_cover || "/placeholder.svg"}
            alt={book.title || "No title available"}
            fill
            className="object-cover"
          />
        </div>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">
            {book?.author?.name || "Unknown Author"}
          </p>
          <h3 className="font-medium text-sm leading-tight">
            {book.title || "No title available"}
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-base font-bold">
              {book?.price
                ? `$${book.price.toFixed(2)}`
                : "Price not available"}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
