"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function Hero() {
  return (
    <section className="relative border-b-4 border-black overflow-hidden bg-[#FCFAEE]">
      {/* Background Decorative Patterns */}
      <div className="absolute top-0 right-0 w-1/2 h-full bg-[#1B4332]/5 -skew-x-12 translate-x-32 hidden lg:block" />

      <div className="max-w-[95%] lg:max-w-[90%] mx-auto grid lg:grid-cols-2 min-h-[85vh] items-center gap-16 py-16 lg:py-0">
        
        {/* Left Side: Copy */}
        <div className="space-y-10 z-20 relative text-center lg:text-left">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-6xl sm:text-7xl md:text-8xl font-black uppercase italic leading-[0.85] tracking-tighter">
              Publish <br /> 
              <span className="text-primary not-italic">Beyond</span> <br /> 
              Limits<span className="text-accent">.</span>
            </h1>
            <p className="mt-8 text-lg md:text-2xl font-bold max-w-xl mx-auto lg:mx-0 leading-tight opacity-90">
              The premium marketplace for African storytellers. Reach global readers with E-books and high-quality print.
            </p>
          </motion.div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
            <Link href="/shop" className="w-full sm:w-auto">
              <Button className="booka-button-primary w-full text-xl h-16 px-10">
                Explore Shop
              </Button>
            </Link>
            <Link href="/register" className="w-full sm:w-auto">
              <Button className="booka-button-secondary w-full text-xl h-16 px-10">
                Start Selling
              </Button>
            </Link>
          </div>
        </div>

        {/* Right Side: Visual Collage */}
        <div className="relative h-[450px] sm:h-[600px] lg:h-full flex items-center justify-center pt-10 lg:pt-0">
          
          {/* Central Glow */}
          <div className="absolute w-64 h-64 bg-accent/30 rounded-full blur-[100px]" />

          <div className="relative w-full max-w-[320px] sm:max-w-[400px] aspect-[3/4]">
            
            {/* 1. The "Hardcover" (Main Bottom Layer) */}
            <motion.div 
              initial={{ rotate: -5, x: -20, opacity: 0 }}
              animate={{ rotate: -8, x: -30, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.8 }}
              className="absolute inset-0 border-4 border-black bg-[#1B4332] gumroad-shadow flex items-center justify-center"
            >
                <div className="p-4 text-center">
                    <div className="w-12 h-1 bg-accent mx-auto mb-4" />
                    <p className="text-white font-black uppercase text-xs tracking-[0.2em]">Hardcover Edition</p>
                </div>
            </motion.div>

            {/* 2. The "E-Book" Tablet (Middle Layer) */}
            <motion.div 
              initial={{ rotate: 5, x: 20, opacity: 0 }}
              animate={{ rotate: 4, x: 10, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="absolute inset-0 border-4 border-black bg-white gumroad-shadow overflow-hidden"
            >
              <div className="h-full w-full flex flex-col">
                <div className="h-full bg-gray-100 flex items-center justify-center p-6 border-b-4 border-black">
                   <div className="w-full h-full bg-accent/20 border-2 border-dashed border-black/20 flex items-center justify-center font-black italic text-black/20 text-4xl">
                     PREVIEW
                   </div>
                </div>
                <div className="p-4 bg-white">
                   <div className="h-2 w-1/2 bg-black mb-2" />
                   <div className="h-2 w-full bg-black/10" />
                </div>
              </div>
            </motion.div>

            {/* 3. The "Hero Book" (Top Layer) */}
            <motion.div 
              whileHover={{ scale: 1.02, rotate: 0 }}
              className="absolute inset-0 border-4 border-black bg-white gumroad-shadow-sm overflow-hidden flex flex-col cursor-pointer z-10"
            >
              <div className="flex-1 bg-gradient-to-br from-gray-50 to-gray-200 relative">
                 <div className="absolute inset-0 flex flex-col justify-end p-6 bg-gradient-to-t from-black/90 via-black/40 to-transparent text-white">
                    <span className="bg-accent text-black self-start px-2 py-0.5 text-[10px] font-black uppercase mb-3 border-2 border-black">New Release</span>
                    <h3 className="text-2xl sm:text-3xl font-black uppercase italic leading-none mb-1">Revelation</h3>
                    <p className="text-sm font-bold opacity-80 uppercase tracking-widest">Israel Ayeni</p>
                 </div>
              </div>
            </motion.div>

            {/* 4. Floating "100% Royalty" Badge */}
            <motion.div 
              animate={{ 
                y: [0, -12, 0],
                rotate: [-12, -8, -12] 
              }}
              transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
              className={cn(
                "absolute z-20 -top-8 -right-8 sm:-top-12 sm:-right-12",
                "w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-accent border-4 border-black",
                "gumroad-shadow flex flex-col items-center justify-center text-center p-2"
              )}
            >
              <span className="text-[10px] sm:text-xs font-black uppercase leading-none">Up to</span>
              <span className="text-xl sm:text-3xl font-black italic leading-none">100%</span>
              <span className="text-[10px] sm:text-xs font-black uppercase leading-none">Royalty</span>
            </motion.div>

            {/* 5. Mini "Verified" Circle */}
            <div className="absolute -bottom-4 -left-4 z-20 w-12 h-12 bg-primary rounded-full border-4 border-black flex items-center justify-center text-accent">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}