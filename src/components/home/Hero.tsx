"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { useEffect, useState, useRef } from "react";
import Autoplay from "embla-carousel-autoplay";

interface Product {
  id: number;
  title: string;
  brand: string;
  price: number;
  originalPrice: number;
  discount: number;
  image: string;
}

interface HeroSlide {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  image: string;
}

const heroSlides: HeroSlide[] = [
  {
    id: 1,
    title: "INSTA",
    subtitle: "Beautifully Designed",
    description: "Cover up front of book and leave summary",
    image: "/book.jpeg",
  },
  {
    id: 2,
    title: "NOVA",
    subtitle: "Elegantly Crafted",
    description: "Explore the universe of knowledge",
    image: "/book.jpeg",
  },
  {
    id: 3,
    title: "ECHO",
    subtitle: "Resonating Wisdom",
    description: "Let your mind wander through pages",
    image: "/book.jpeg",
  },
];

const relatedProducts: Product[] = [
  {
    id: 1,
    title: "BOOK: Do You Really Need It? This Will Help You",
    brand: "Ypple",
    price: 51.2,
    originalPrice: 64.0,
    discount: 20,
    image: "/book.jpeg",
  },
  {
    id: 2,
    title: "Here Is A Quick Cure For BOOK This Will Help",
    brand: "Wpple",
    price: 51.2,
    originalPrice: 64.0,
    discount: 20,
    image: "/book.jpeg",
  },
  {
    id: 3,
    title: "Unlock Your Potential With This Must-Have BOOK",
    brand: "Xpple",
    price: 48.5,
    originalPrice: 60.0,
    discount: 19,
    image: "/book.jpeg",
  },
];

export default function Hero() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (carouselRef.current) {
      carouselRef.current.scrollTo({
        left: currentSlide * carouselRef.current.offsetWidth,
        behavior: "smooth",
      });
    }
  }, [currentSlide]);

  return (
    <div className="container px-4 py-8 md:py-12">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 shadow-md px-3 py-1 rounded-sm">
          <Carousel className="w-full" plugins={[Autoplay({ delay: 2000 })]}>
            <CarouselContent ref={carouselRef} className="flex">
              {heroSlides.map((slide, index) => (
                <CarouselItem key={slide.id} className="w-full flex-shrink-0">
                  <div className="grid gap-6 md:grid-cols-2 items-center">
                    <div className="space-y-4">
                      <div>
                        <h2 className="text-sm text-muted-foreground mb-2">
                          {slide.subtitle}
                        </h2>
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                          {slide.title}
                        </h1>
                      </div>
                      <p className="text-muted-foreground">
                        {slide.description}
                      </p>
                      <Button
                        variant="outline"
                        className="border-green-600 text-green-600 hover:bg-green-600 hover:text-white"
                      >
                        Shop Now
                      </Button>
                    </div>
                    <div className="relative aspect-[3/4] overflow-hidden rounded-lg">
                      <Image
                        src={slide.image}
                        alt={`${slide.title} Book Mockup`}
                        className="object-cover"
                        fill
                        priority
                      />
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <div className="flex justify-center gap-2 mt-4">
              {heroSlides.map((_, index) => (
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
        </div>
        <div className="space-y-4">
          <Carousel plugins={[Autoplay({ delay: 2000 })]}>
            <CarouselContent>
              {relatedProducts.map((product) => (
                <CarouselItem key={product.id} className="p-4">
                  <Link href="#" className="flex gap-4">
                    <div className="relative w-20 h-28">
                      <Image
                        src={product.image}
                        alt={product.title}
                        fill
                        className="object-cover rounded"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">
                        {product.brand}
                      </p>
                      <h3 className="font-medium leading-tight">
                        {product.title}
                      </h3>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-green-600 font-bold">
                          £{product.price.toFixed(2)}
                        </span>
                        <span className="text-sm text-muted-foreground line-through">
                          £{product.originalPrice.toFixed(2)}
                        </span>
                        <span className="text-sm bg-red-100 text-red-600 px-1.5 py-0.5 rounded">
                          {product.discount}%
                        </span>
                      </div>
                    </div>
                  </Link>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
          <Carousel plugins={[Autoplay({ delay: 2000 })]}>
            <CarouselContent>
              {relatedProducts.map((product) => (
                <CarouselItem key={product.id} className="p-4">
                  <Link href="#" className="flex gap-4">
                    <div className="relative w-20 h-28">
                      <Image
                        src={product.image}
                        alt={product.title}
                        fill
                        className="object-cover rounded"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">
                        {product.brand}
                      </p>
                      <h3 className="font-medium leading-tight">
                        {product.title}
                      </h3>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-green-600 font-bold">
                          £{product.price.toFixed(2)}
                        </span>
                        <span className="text-sm text-muted-foreground line-through">
                          £{product.originalPrice.toFixed(2)}
                        </span>
                        <span className="text-sm bg-red-100 text-red-600 px-1.5 py-0.5 rounded">
                          {product.discount}%
                        </span>
                      </div>
                    </div>
                  </Link>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </div>
      </div>
    </div>
  );
}
