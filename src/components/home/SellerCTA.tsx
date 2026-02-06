"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { 
  Truck, 
  ShieldCheck, 
  LayoutDashboard, 
  Smartphone, 
  Globe, 
  ArrowRight
} from "lucide-react";

export default function SellerCTA() {
  const values = [
    {
      title: "Secure PDF Watermarking",
      desc: "Every download is custom-encrypted with user credentials to prevent piracy and unauthorized sharing.",
      icon: ShieldCheck,
      color: "text-accent"
    },
    {
      title: "Physical Fulfillment",
      desc: "We handle the logistics. From professional printing to doorstep delivery for your physical book orders.",
      icon: Truck,
      color: "text-[#58CC02]" 
    },
    {
      title: "Immersive In-App Reader",
      desc: "Provide your readers with a distraction-free, premium digital experience directly within the Booka app.",
      icon: Smartphone,
      color: "text-blue-400"
    },
    {
      title: "Independent Storefronts",
      desc: "Launch your own branded publishing house with a custom slug or subdomain powered by our infrastructure.",
      icon: LayoutDashboard,
      color: "text-purple-400"
    }
  ];

  return (
    <section className="py-16 lg:py-32 bg-primary text-white border-b-[1.5px] border-black overflow-hidden relative">
      
      {/* Decorative Blur */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-[1280px] mx-auto px-6 md:px-12 relative z-10">
        <div className="flex flex-col lg:grid lg:grid-cols-[1fr_1.1fr] gap-12 lg:gap-24">
          
          {/* Left: The Hook (Mobile-friendly stacking) */}
          <div className="space-y-6 lg:space-y-8 lg:sticky lg:top-32 h-fit">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-5xl md:text-7xl lg:text-8xl font-black uppercase italic leading-[0.9] tracking-tighter">
                Stop Waiting. <br />
                <span className="text-accent">Start Selling.</span>
              </h2>
              
              <p className="mt-6 text-base md:text-xl font-medium leading-relaxed text-gray-300 max-w-md">
                Whether you're a major Nigerian publisher or an independent Ghanaian author, 
                Booka provides the tools you need to reach readers globally.
              </p>
            </motion.div>

            <div className="relative z-20"> {/* Higher Z-index to prevent card overlap */}
              <Link href="/register">
                <Button className="booka-button-primary h-14 md:h-16 px-8 md:px-12 text-base md:text-lg group w-full sm:w-auto">
                  Join the Platform <ArrowRight className="ml-2 group-hover:translate-x-2 transition-transform" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Right: The Grid of Value (Legible Sentence Case) */}
          <div className="grid sm:grid-cols-2 gap-4 relative z-10">
            {values.map((v, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white/5 border-[1.5px] border-white/10 p-5 md:p-6 rounded-[var(--radius)] hover:bg-white/10 transition-colors group"
              >
                <v.icon className={cn("mb-4 transition-transform group-hover:scale-110", v.color)} size={28} />
                <h3 className="font-black uppercase italic text-sm tracking-tight mb-2">
                  {v.title}
                </h3>
                {/* 🔥 Sentence case for readability */}
                <p className="text-[11px] font-medium leading-relaxed text-gray-400">
                  {v.desc}
                </p>
              </motion.div>
            ))}

            {/* Global Payments Banner */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="sm:col-span-2 bg-accent text-black border-[1.5px] border-black p-5 md:p-6 rounded-[var(--radius)] flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            >
              <div className="bg-black text-accent p-3 rounded-full shrink-0">
                <Globe size={24} />
              </div>
              <div>
                <h3 className="font-black uppercase italic text-sm tracking-tight">Global Payment Integration</h3>
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">
                  Accept Naira and global currencies with instant payouts.
                </p>
              </div>
            </motion.div>
          </div>

        </div>
      </div>
    </section>
  );
}