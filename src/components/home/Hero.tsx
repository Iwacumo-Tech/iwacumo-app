"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { useEffect, useState, useRef } from "react";
import Autoplay from "embla-carousel-autoplay";
import { trpc } from "@/app/_providers/trpc-provider";

export default function Hero() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const heroSlide = trpc.getAllHeroSlides.useQuery();
  const featuredBooks = trpc.getAllFeaturedBooks.useQuery();

  useEffect(() => {
    if (carouselRef.current) {
      carouselRef.current.scrollTo({
        left: currentSlide * carouselRef.current.offsetWidth,
        behavior: "smooth",
      });
    }
  }, [currentSlide]);

  return (
    <div className="max-w-[80%] mx-auto px-4 py-8 md:py-12">
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Hero Slider */}
        <div className="lg:col-span-2 h-[600px]">
          {heroSlide.data && heroSlide.data.length > 0 ? (
            <Carousel
              className="w-full h-[600px]"
              plugins={[Autoplay({ delay: 2000 })]}
            >
              <CarouselContent ref={carouselRef} className="flex h-[600px]">
                {heroSlide.data.map((slide) => (
                  <CarouselItem
                    key={slide.id}
                    className="w-full flex-shrink-0 bg-cover bg-center bg-no-repeat h-[600px]"
                    style={{
                      backgroundImage: `url(${slide.image || "/noimage.jpeg"})`,
                    }}
                  >
                    <div className="grid gap-6 md:grid-cols-2 items-center p-8 h-full">
                      <div className="space-y-4">
                        {/* Subtitle */}
                        <p className="text-lg text-green-600 font-semibold">
                          {slide.subtitle}
                        </p>

                        {/* Title */}
                        <h1 className="text-7xl font-extrabold text-gray-800 leading-tight">
                          {slide.title}
                        </h1>

                        {/* Description */}
                        <p className="italic text-gray-600 text-base">
                          {slide.description}
                        </p>

                        {/* Button */}
                        <Button
                          variant="outline"
                          className="border-green-600 border-2 text-green-600 hover:bg-green-600 hover:text-white px-8 py-6 bg-transparent rounded-none font-bold text-lg"
                        >
                          <Link href={slide.buttonRoute}>
                            {slide.buttonText}
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <div className="flex justify-center gap-2 mt-4">
                {heroSlide.data.map((_, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    size="icon"
                    className={`h-2 w-2 rounded-full ${
                      currentSlide === index ? "bg-green-600" : "bg-muted"
                    }`}
                    onClick={() => setCurrentSlide(index)}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>
            </Carousel>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500 text-lg">
              No data for heroslider
            </div>
          )}
        </div>

        <div className="space-y-4">
          {/* First Related Products Carousel (Books 0 and 1) */}
          <Carousel plugins={[Autoplay({ delay: 5000 })]}>
            <CarouselContent>
              {featuredBooks.data && featuredBooks.data.length > 0 ? (
                featuredBooks.data.slice(0, 2).map((book) => (
                  <CarouselItem key={book.id} className="p-4">
                    <Link href="#" className="flex gap-4">
                      <div className="relative w-20 h-28">
                        <img
                          src={book.book_cover || "/noimage.jpeg"}
                          alt={book.title}
                          className="object-cover rounded w-full h-full"
                        />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">
                          {book.author?.name || "Unknown Author"}
                        </p>
                        <h3 className="font-medium leading-tight">
                          {book.title}
                        </h3>
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-green-600 font-bold">
                            ₦{book.price}
                          </span>
                        </div>
                      </div>
                    </Link>
                  </CarouselItem>
                ))
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500 text-lg">
                  No data to show
                </div>
              )}
            </CarouselContent>
          </Carousel>

          {/* Second Related Products Carousel (Books 2 and 3) */}
          <Carousel plugins={[Autoplay({ delay: 5000 })]}>
            <CarouselContent>
              {featuredBooks.data && featuredBooks.data.length > 2 ? (
                featuredBooks.data.slice(2, 4).map((book) => (
                  <CarouselItem key={book.id} className="p-4">
                    <Link href="#" className="flex gap-4">
                      <div className="relative w-20 h-28">
                        <img
                          src={book.book_cover || "/noimage.jpeg"}
                          alt={book.title}
                          className="object-cover rounded w-full h-full"
                        />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">
                          {book.author?.name || "Unknown Author"}
                        </p>
                        <h3 className="font-medium leading-tight">
                          {book.title}
                        </h3>
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-green-600 font-bold">
                            ${book.price}
                          </span>
                        </div>
                      </div>
                    </Link>
                  </CarouselItem>
                ))
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500 text-lg">
                  No data to show
                </div>
              )}
            </CarouselContent>
          </Carousel>
        </div>
      </div>
    </div>
  );
}
