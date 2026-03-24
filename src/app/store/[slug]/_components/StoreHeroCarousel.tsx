"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MoveRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function StoreHeroCarousel({ slides }: { slides: any[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [slides.length]);

  if (!slides.length) return null;

  const current = slides[index];

  return (
    <section className="max-w-[1440px] mx-auto px-6 md:px-12 py-8 lg:py-12">
      <div className="relative h-[400px] md:h-[550px] border-[1.5px] border-black rounded-[var(--radius)] overflow-hidden gumroad-shadow bg-white">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0 grid lg:grid-cols-2"
          >
            {/* Image Section */}
            <div className="relative order-1 lg:order-2 bg-gray-100 overflow-hidden border-b-[1.5px] lg:border-b-0 lg:border-l-[1.5px] border-black">
              <img 
                src={current.image} 
                className="w-full h-full object-cover" 
                alt={current.title} 
              />
              <div className="absolute inset-0 bg-black/5" />
            </div>

            {/* Content Section */}
            <div className="p-8 lg:p-16 flex flex-col justify-center order-2 lg:order-1">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-accent bg-black w-fit px-3 py-1 rounded-full mb-6">
                {current.subtitle}
              </span>
              <h2 className="text-4xl md:text-6xl font-black uppercase italic leading-none tracking-tighter mb-6">
                {current.title}
              </h2>
              <p className="text-sm md:text-lg font-medium text-gray-600 mb-10 max-w-md leading-relaxed">
                {current.description}
              </p>
              
              <Link href={current.buttonRoute}>
                <Button className="booka-button-primary h-14 px-8 group">
                  {current.buttonText} <MoveRight className="ml-2 group-hover:translate-x-2 transition-transform" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Controls */}
        <div className="absolute bottom-6 right-6 flex gap-2 z-30">
          <button 
            onClick={() => setIndex((index - 1 + slides.length) % slides.length)}
            className="p-3 bg-white border-[1.5px] border-black rounded-full hover:bg-accent transition-all"
          >
            <ChevronLeft size={18} />
          </button>
          <button 
            onClick={() => setIndex((index + 1) % slides.length)}
            className="p-3 bg-white border-[1.5px] border-black rounded-full hover:bg-accent transition-all"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </section>
  );
}