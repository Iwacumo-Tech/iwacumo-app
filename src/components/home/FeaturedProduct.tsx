"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface Product {
  id: number;
  title: string;
  brand: string;
  image: string;
  price: number;
  originalPrice: number;
  discount: number;
}

const products: Product[] = [
  {
    id: 1,
    title: "Beats EP Wired On-Ear Digital Headphone-Black",
    brand: "Cpple",
    image: "/placeholder.svg?height=400&width=300",
    price: 51.2,
    originalPrice: 64.0,
    discount: 20,
  },
  {
    id: 2,
    title: "Beats Solo3 Wireless On-Ear Headphones",
    brand: "Lpple",
    image: "/placeholder.svg?height=400&width=300",
    price: 51.2,
    originalPrice: 64.0,
    discount: 20,
  },
  {
    id: 3,
    title: "In 10 Minutes, I'll Give You The Truth About",
    brand: "Epple",
    image: "/placeholder.svg?height=400&width=300",
    price: 51.2,
    originalPrice: 64.0,
    discount: 20,
  },
  {
    id: 4,
    title: "What Can You Do To Save Your BOOK",
    brand: "Gpple",
    image: "/placeholder.svg?height=400&width=300",
    price: 51.2,
    originalPrice: 64.0,
    discount: 20,
  },
  {
    id: 5,
    title: "Find Out More About BOOK By Social Media?",
    brand: "Gpple",
    image: "/placeholder.svg?height=400&width=300",
    price: 51.2,
    originalPrice: 64.0,
    discount: 20,
  },
];

export default function ProductTabs() {
  return (
    <div className="container mx-auto px-4">
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
          <TabsTrigger
            value="most-viewed"
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
            Most View Products
          </TabsTrigger>
        </TabsList>
        <TabsContent value="featured" className="mt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </TabsContent>
        <TabsContent value="new" className="mt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </TabsContent>
        <TabsContent value="most-viewed" className="mt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ProductCard({ product }: { product: Product }) {
  return (
    <Card className="border-none shadow-none">
      <CardContent className="p-0 space-y-3">
        <div className="relative aspect-[3/4] bg-gray-100">
          <Image
            src={product.image}
            alt={product.title}
            fill
            className="object-cover"
          />
        </div>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{product.brand}</p>
          <h3 className="font-medium text-sm leading-tight">{product.title}</h3>
          <div className="flex items-center gap-2">
            <span className="text-base font-bold">
              £{product.price.toFixed(2)}
            </span>
            <span className="text-xs text-muted-foreground line-through">
              £{product.originalPrice.toFixed(2)}
            </span>
            <span className="text-xs text-white bg-red-500 px-1.5 py-0.5 rounded">
              {product.discount}%
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
