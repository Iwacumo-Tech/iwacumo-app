"use client";

import Header from "@/components/shared/Header";
import Footer from "@/components/shared/Footer";
import Hero from "@/components/home/Hero";
import FeaturedSection from "@/components/home/FeaturedSection";
import Marquee from "@/components/home/Marquee";
import CategoryGrid from "@/components/home/CategoryGrid";
import SellerCTA from "@/components/home/SellerCTA";
import { TawkChat } from "@/components/shared/tawk-chat";

export default function Home() {
  return (
    <main className="min-h-screen bg-background selection:bg-accent selection:text-black">
      <TawkChat />
      <Header />
      
      {/* 1. Impactful Hero Section */}
      <Hero />

      {/* 2. Scrolling Trust Bar (Publishers & Partners) */}
      <Marquee text="Naija Reads • Accra Stories • Nairobi Voices • Joburg Journals • Booka Originals" />

      {/* 3. Curator's Choice (The Admin-Featured Section) */}
      <FeaturedSection title="Curator's Choice" filter="featured" />

      {/* 4. Visual Category Navigation */}
      <CategoryGrid />

      {/* 5. Trending This Week */}
      <FeaturedSection title="Trending This Week" filter="trending" bgColor="bg-white" />

      {/* 6. Dual-Purpose CTA for Sellers */}
      <SellerCTA />
      
      <Footer />
    </main>
  );
}
