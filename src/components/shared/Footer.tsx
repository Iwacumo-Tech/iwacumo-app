import { Facebook, Twitter, Youtube, Instagram, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground border-t-4 border-black">
      <div className="max-w-[90%] mx-auto px-4 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
          
          {/* Brand Column */}
          <div className="space-y-6">
            <Link href="/" className="block">
              <Image 
                src="/yellow-logo.png" 
                alt="Booka Logo" 
                width={140} 
                height={50} 
                className="object-contain"
              />
            </Link>
            <p className="text-primary-foreground/80 font-medium leading-relaxed max-w-sm">
              Empowering African authors and publishers to share their stories with the world. Digital delivery, physical quality.
            </p>
            <div className="flex gap-4">
              <SocialLink icon={<Twitter size={20} />} />
              <SocialLink icon={<Instagram size={20} />} />
              <SocialLink icon={<Facebook size={20} />} />
            </div>
          </div>

          {/* Combined Links Container - Grid of 2 on Mobile */}
          <div className="grid grid-cols-2 lg:col-span-2 gap-8">
            {/* Quick Links */}
            <FooterSection title="Platform">
              <FooterLink href="/shop">Discover Books</FooterLink>
              <FooterLink href="/register">Become a Publisher</FooterLink>
              <FooterLink href="/app">Author Dashboard</FooterLink>
              <FooterLink href="/blog">Literary Blog</FooterLink>
            </FooterSection>

            {/* Support */}
            <FooterSection title="Support">
              <FooterLink href="/contact">Help Center</FooterLink>
              <FooterLink href="/terms">Terms of Service</FooterLink>
              <FooterLink href="/privacy">Privacy Policy</FooterLink>
              <FooterLink href="/shipping">Shipping Policy</FooterLink>
            </FooterSection>
          </div>

          {/* Newsletter - High Energy */}
          <div className="space-y-6">
            <h3 className="font-black text-xl uppercase tracking-tight">Stay Inspired</h3>
            <p className="text-sm font-bold opacity-70 italic">Get the latest African releases delivered to your inbox.</p>
            <div className="flex flex-col gap-2">
              <Input
                type="email"
                placeholder="you@email.com"
                className="bg-white border-2 border-black rounded-none text-black h-12 focus:ring-accent placeholder:text-black/40"
              />
              <Button className="booka-button-primary h-12 text-black">
                Join Now <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-20 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-6 text-xs font-bold uppercase tracking-widest opacity-60">
          <p className="text-center md:text-left">© 2026 Booka Publishing Platform. Built for the Continent.</p>
          <div className="flex flex-wrap justify-center gap-4 md:gap-8">
            <span>Lagos, Nigeria</span>
            <span>Nairobi, Kenya</span>
            <span>Accra, Ghana</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <h3 className="font-black text-lg md:text-xl uppercase tracking-tight text-accent">{title}</h3>
      <ul className="space-y-4 flex flex-col">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="group text-sm font-bold opacity-80 hover:opacity-100 hover:text-accent transition-all flex items-center gap-0 hover:gap-2">
        <span className="h-[2px] w-0 bg-accent transition-all group-hover:w-4" />
        {children}
      </Link>
    </li>
  );
}

function SocialLink({ icon }: { icon: React.ReactNode }) {
  return (
    <a href="#" className="p-3 bg-white/10 border border-white/20 hover:bg-accent hover:text-black transition-all">
      {icon}
    </a>
  );
}