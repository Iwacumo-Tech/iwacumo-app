"use client";

import { useState } from "react";
import Image from "next/image";
import { Grid3x3, LayoutGrid, List } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/app/_providers/trpc-provider";
import { Book } from "@prisma/client";

type ViewMode = "grid" | "grid3x3" | "list";

export default function BookGrid() {
  const [viewMode, setViewMode] = useState<ViewMode>("grid3x3");
  const AllBooks = trpc.getAllBooks.useQuery();

  return (
    <div className="container mx-auto p-4 max-w-7xl mt-3">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "grid3x3" ? "default" : "outline"}
            size="icon"
            onClick={() => setViewMode("grid3x3")}
          >
            <Grid3x3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="icon"
            onClick={() => setViewMode("grid")}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="icon"
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground ml-4">
            Showing 1 to 9 of 14 (2 Pages)
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Select defaultValue="3">
            <SelectTrigger className="w-20">
              <SelectValue placeholder="Show" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">3</SelectItem>
              <SelectItem value="6">6</SelectItem>
              <SelectItem value="9">9</SelectItem>
            </SelectContent>
          </Select>
          <Select defaultValue="default">
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort By" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default Sorting</SelectItem>
              <SelectItem value="price-low">Price: Low to High</SelectItem>
              <SelectItem value="price-high">Price: High to Low</SelectItem>
              <SelectItem value="name">Name</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {AllBooks.data ? (
        <div
          className={cn(
            "grid gap-2",
            viewMode === "grid3x3" &&
              "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
            viewMode === "grid" && "grid-cols-1 sm:grid-cols-2",
            viewMode === "list" && "grid-cols-1"
          )}
        >
          {AllBooks.data?.map((book) => (
            <Card
              key={book.id}
              className={cn(viewMode === "list" && "flex flex-row")}
            >
              <div
                className={cn(
                  viewMode === "list" ? "w-1/3" : "w-full",
                  "relative aspect-[4/5]"
                )}
              >
                <Image
                  src={book.book_cover!}
                  alt={book.title}
                  fill
                  className="object-cover rounded-t-lg"
                />
              </div>
              <div className={cn(viewMode === "list" && "w-2/3")}>
                <CardHeader className="p-3 pb-0">
                  <p className="text-sm text-muted-foreground">
                    {book.author?.name || "unknown Author"}
                  </p>
                  <h3 className="font-semibold leading-none tracking-tight text-sm">
                    {book.title}
                  </h3>
                </CardHeader>
                <CardContent className="p-3 pt-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold">
                      ${book.price.toFixed(2)}
                    </span>
                  </div>
                </CardContent>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div>No data available</div>
      )}
    </div>
  );
}
