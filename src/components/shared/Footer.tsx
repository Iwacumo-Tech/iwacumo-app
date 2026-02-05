import { Facebook, Twitter, Youtube, Instagram, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground border-t-4 border-black mt-20">
      <div className="max-w-[90%] mx-auto px-4 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          
          {/* Brand Column */}
          <div className="space-y-6">
            <h2 className="text-4xl font-black uppercase italic tracking-tighter">
              Booka<span className="text-accent">.</span>
            </h2>
            <p className="text-primary-foreground/80 font-medium leading-relaxed">
              Empowering African authors and publishers to share their stories with the world. Digital delivery, physical quality.
            </p>
            <div className="flex gap-4">
              <SocialLink icon={<Twitter size={20} />} />
              <SocialLink icon={<Instagram size={20} />} />
              <SocialLink icon={<Facebook size={20} />} />
            </div>
          </div>

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

          {/* Newsletter - High Energy */}
          <div className="space-y-6">
            <h3 className="font-black text-xl uppercase tracking-tight">Stay Inspired</h3>
            <p className="text-sm font-bold opacity-70 italic">Get the latest African releases delivered to your inbox.</p>
            <div className="flex flex-col gap-2">
              <Input
                type="email"
                placeholder="you@email.com"
                className="bg-white border-2 border-black rounded-none text-black h-12 focus:ring-accent"
              />
              <Button className="booka-button-primary h-12">
                Join Now <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-20 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-bold uppercase tracking-widest opacity-60">
          <p>© 2026 Booka Publishing Platform. Built for the Continent.</p>
          <div className="flex gap-8">
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
      <h3 className="font-black text-xl uppercase tracking-tight text-accent">{title}</h3>
      <ul className="space-y-4 flex flex-col">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="text-sm font-bold opacity-80 hover:opacity-100 hover:text-accent transition-all flex items-center gap-2">
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