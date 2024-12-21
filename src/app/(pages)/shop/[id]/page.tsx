"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Heart, Scale, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { trpc } from "@/app/_providers/trpc-provider";

export default function ProductDetails() {
  const [quantity, setQuantity] = useState(1);
  const [currentImage, setCurrentImage] = useState(0);
  const params = useParams();
  const id = params?.id as string;
  const { data: book } = trpc.getBookById.useQuery({ id: id });

  const images = [
    book?.book_cover || "/bookcover.png",
    book?.book_cover || "/default-book-cover.jpg",
    book?.book_cover || "/default-book-cover.jpg",
    book?.book_cover || "/default-book-cover.jpg",
  ];

  return (
    <div className="container mx-auto px-4 py-8 w-[80%]">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Product Images */}
        <div className="space-y-4">
          <div className="relative aspect-[4/5] bg-gray-100">
            <Image
              src={images[currentImage]}
              alt="Product"
              fill
              className="object-cover"
            />
          </div>
          <div className="relative">
            <button
              onClick={() => setCurrentImage((prev) => Math.max(0, prev - 1))}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full p-1 shadow-md"
              disabled={currentImage === 0}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="flex gap-4 overflow-x-auto px-8">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentImage(idx)}
                  className={cn(
                    "relative w-24 aspect-[4/5] flex-shrink-0",
                    currentImage === idx && "ring-2 ring-[#82d236]"
                  )}
                >
                  <Image
                    src={img}
                    alt={`Product ${idx + 1}`}
                    fill
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
            <button
              onClick={() =>
                setCurrentImage((prev) => Math.min(images.length - 1, prev + 1))
              }
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full p-1 shadow-md"
              disabled={currentImage === images.length - 1}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Product Info */}
        <div className="space-y-6">
          <div>
            <div className="mb-4">
              <span className="text-sm text-gray-500">Tags: </span>
              <Link
                href="#"
                className="text-sm text-gray-700 hover:text-[#82d236]"
              >
                Movado
              </Link>
              <span className="text-gray-500">, </span>
              <Link
                href="#"
                className="text-sm text-gray-700 hover:text-[#82d236]"
              >
                Omega
              </Link>
            </div>
            <h1 className="text-2xl font-bold mb-4">{book?.title}</h1>
            <div className="flex items-center gap-2 mb-4">
              <div className="flex">
                {[...Array(4)].map((_, i) => (
                  <Star
                    key={i}
                    className="h-5 w-5 fill-yellow-400 text-yellow-400"
                  />
                ))}
                <Star className="h-5 w-5 text-gray-300" />
              </div>
              <span className="text-sm text-gray-500">(1 Reviews)</span>
              <Link
                href="#"
                className="text-sm text-gray-700 hover:text-[#82d236]"
              >
                Write A Review
              </Link>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm">Ex Tax:</span>
              <span className="text-[#82d236]">£60.24</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm">Brands:</span>
              <Link href="#" className="text-[#82d236] hover:underline">
                Canon
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm">Product Code:</span>
              <span>model1</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm">Reward Points:</span>
              <span>200</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm">Availability:</span>
              <span className="text-[#82d236]">In Stock</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-3xl font-bold text-[#82d236]">
              ₦ {book?.price}
            </span>
          </div>

          <p className="text-gray-600">{book?.description}</p>

          <div className="flex items-center gap-4">
            <div className="flex items-center">
              <span className="mr-4">Qty</span>
              <Input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value))}
                className="w-20"
              />
            </div>
            <Button className="bg-[#82d236] hover:bg-[#72bc2d]">
              + Add To Cart
            </Button>
          </div>

          <div className="flex items-center gap-4">
            <Button variant="outline" className="flex items-center gap-2">
              <Heart className="h-4 w-4" />
              Add to Wish List
            </Button>
            <Button variant="outline" className="flex items-center gap-2">
              <Scale className="h-4 w-4" />
              Add to Compare
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
