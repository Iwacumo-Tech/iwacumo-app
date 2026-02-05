// src/components/home/SellerCTA.tsx
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function SellerCTA() {
  return (
    <section className="py-24 bg-primary text-primary-foreground border-b-4 border-black overflow-hidden relative">
      {/* Background Decorative Element */}
      <div className="absolute top-0 right-0 w-1/3 h-full bg-accent -rotate-12 translate-x-20 translate-y-10 border-l-4 border-black hidden lg:block" />

      <div className="max-w-[90%] mx-auto relative z-10">
        <div className="max-w-2xl space-y-8">
          <h2 className="text-5xl md:text-7xl font-black uppercase italic leading-[0.9] tracking-tighter">
            Stop Waiting. <br />
            <span className="text-accent">Start Selling.</span>
          </h2>
          <p className="text-xl md:text-2xl font-bold opacity-90 leading-snug">
            Whether you're a major Nigerian publisher or an independent Ghanaian author, Booka gives you the tools to reach readers globally.
          </p>
          
          <ul className="space-y-4">
            <li className="flex items-center gap-3 font-bold uppercase text-sm">
              <span className="bg-accent text-black p-1 border border-black italic font-black">✓</span> 
              Instant Digital Delivery
            </li>
            <li className="flex items-center gap-3 font-bold uppercase text-sm">
              <span className="bg-accent text-black p-1 border border-black italic font-black">✓</span> 
              Secure PDF Watermarking
            </li>
            <li className="flex items-center gap-3 font-bold uppercase text-sm">
              <span className="bg-accent text-black p-1 border border-black italic font-black">✓</span> 
              Multi-tenant Publisher Dashboards
            </li>
          </ul>

          <div className="pt-6">
            <Link href="/register">
              <Button className="booka-button-primary text-xl h-16 px-12">
                Join the Platform
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}