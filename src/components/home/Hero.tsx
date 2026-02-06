"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { MoveRight, Sparkles, BookOpen, Globe, Zap } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative bg-[#FAF9F6] pt-16 pb-24 lg:pt-28 lg:pb-40 overflow-hidden border-b-[1.5px] border-black">
      
      {/* 1. Subtle Background Depth */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-accent/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-black/5 rounded-full blur-[100px]" />
      </div>

      {/* 2. Increased Max-Width Container */}
      <div className="max-w-[1280px] mx-auto px-6 md:px-12 relative">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-12 lg:gap-24 items-center">
          
          {/* Left Side: Massive Typography */}
          <div className="relative z-20 text-center lg:text-left order-2 lg:order-1">
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="inline-flex items-center gap-2 bg-black text-accent px-4 py-1.5 rounded-full text-[10px] md:text-[11px] font-black uppercase tracking-[0.25em] mb-10 gumroad-shadow-sm">
                <Sparkles size={14} className="animate-pulse" /> Africa's Digital Bookstore
              </div>

              <h1 className="text-6xl sm:text-8xl md:text-[6.5rem] lg:text-[8rem] font-black uppercase italic leading-[0.82] tracking-tighter text-black">
                Write <br /> 
                <span className="text-accent not-italic drop-shadow-[2px_2px_0px_#000]">Your</span> <br /> 
                Fortune<span className="text-accent">.</span>
              </h1>

              <p className="mt-8 text-lg md:text-2xl font-bold max-w-xl mx-auto lg:mx-0 leading-tight text-black/80">
                The high-performance publishing engine for African storytellers. Reach global readers instantly.
              </p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="flex flex-col sm:flex-row gap-4 mt-12 justify-center lg:justify-start"
            >
              <Link href="/shop" className="w-full sm:w-auto">
                <Button className="booka-button-primary h-16 px-12 text-lg group w-full">
                  Explore Shop <MoveRight className="ml-2 group-hover:translate-x-2 transition-transform" />
                </Button>
              </Link>
              <Link href="/register" className="w-full sm:w-auto">
                <Button className="booka-button-secondary h-16 px-12 text-lg w-full">
                  Start Selling
                </Button>
              </Link>
            </motion.div>
          </div>

          {/* Right Side: The "Dynamic Prism" Concept */}
          <div className="relative flex items-center justify-center order-1 lg:order-2 py-12 lg:py-0">
            <div className="relative w-full max-w-[500px] aspect-square flex items-center justify-center">
              
              {/* Layer 1: The "Global Reach" Ring */}
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
                className="absolute inset-0 border-[1.5px] border-dashed border-black/20 rounded-full"
              />

              {/* Layer 2: Floating Feature Cards */}
              
              {/* Digital Card */}
              <motion.div 
                animate={{ y: [0, -15, 0], x: [0, 5, 0] }}
                transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
                className="absolute top-[10%] left-[10%] w-32 h-32 sm:w-44 sm:h-44 bg-accent border-[1.5px] border-black rounded-[var(--radius)] gumroad-shadow rotate-[-12deg] z-30 flex flex-col items-center justify-center p-4 text-center"
              >
                <Zap className="mb-2" size={28} />
                <p className="font-black uppercase italic text-[10px] sm:text-xs leading-none">Instant <br /> Delivery</p>
              </motion.div>

              {/* Global Card */}
              <motion.div 
                animate={{ y: [0, 15, 0], x: [0, -5, 0] }}
                transition={{ repeat: Infinity, duration: 6, ease: "easeInOut", delay: 0.5 }}
                className="absolute bottom-[10%] right-[5%] w-32 h-32 sm:w-48 sm:h-48 bg-black border-[1.5px] border-accent rounded-[var(--radius)] gumroad-shadow rotate-[8deg] z-10 flex flex-col items-center justify-center p-4 text-center text-white"
              >
                <Globe className="mb-2 text-accent" size={32} />
                <p className="font-black uppercase italic text-[10px] sm:text-xs leading-none tracking-widest">Global <br /> Audience</p>
              </motion.div>

              {/* Central Core: The "Booka" Totem */}
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 1 }}
                className="relative w-48 h-64 sm:w-64 sm:h-80 bg-white border-[1.5px] border-black rounded-[var(--radius)] gumroad-shadow-sm overflow-hidden flex flex-col z-20"
              >
                <div className="flex-1 bg-accent/10 flex items-center justify-center p-8 border-b-[1.5px] border-black">
                  <div className="relative group">
                    <BookOpen size={64} className="text-black transition-transform group-hover:scale-110" />
                    <motion.div 
                      animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="absolute inset-0 bg-accent rounded-full -z-10 blur-xl"
                    />
                  </div>
                </div>
                <div className="p-4 sm:p-6 bg-white">
                  <div className="h-1.5 w-12 bg-black mb-3" />
                  <p className="text-sm sm:text-lg font-black uppercase italic leading-none tracking-tighter">Your Legacy Starts Here.</p>
                </div>
              </motion.div>

              {/* Decorative Floating Dots */}
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={{ 
                    scale: [1, 1.5, 1],
                    opacity: [0.3, 0.8, 0.3]
                  }}
                  transition={{ 
                    repeat: Infinity, 
                    duration: 2 + i,
                    delay: i * 0.2
                  }}
                  className="absolute w-2 h-2 bg-black rounded-full"
                  style={{
                    top: `${Math.random() * 100}%`,
                    left: `${Math.random() * 100}%`,
                  }}
                />
              ))}

            </div>
          </div>

        </div>
      </div>
    </section>
  );
}