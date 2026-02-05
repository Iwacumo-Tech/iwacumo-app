// src/components/home/Marquee.tsx
"use client";

import { motion } from "framer-motion";

export default function Marquee({ text }: { text: string }) {
  return (
    <div className="bg-black py-4 border-y-4 border-black overflow-hidden flex whitespace-nowrap">
      <motion.div 
        initial={{ x: 0 }}
        animate={{ x: "-50%" }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="flex gap-10 items-center"
      >
        {/* We repeat the text to ensure it loops seamlessly */}
        {[...Array(10)].map((_, i) => (
          <span key={i} className="text-accent text-2xl font-black uppercase italic flex items-center gap-10">
            {text} <span className="text-white">✦</span>
          </span>
        ))}
      </motion.div>
    </div>
  );
}