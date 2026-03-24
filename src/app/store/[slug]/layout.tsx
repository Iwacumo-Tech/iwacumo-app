import Link from "next/link";
import Image from "next/image";
import prisma from "@/lib/prisma"; // Direct Prisma access for Server Components
import { ShoppingCart, Search } from "lucide-react";

interface StoreLayoutProps {
  children: React.ReactNode;
  params: { slug: string };
}

export default async function StoreLayout({ children, params }: StoreLayoutProps) {
  const { slug } = params;
  
  // Fetch branding data directly on the server
  const store = await prisma.tenant.findUnique({
    where: { slug },
    select: { name: true, logo_url: true }
  });

  return (
    <div className="min-h-screen bg-[#FAF9F6] selection:bg-accent">
      <nav className="h-16 border-b-[1.5px] border-black bg-white sticky top-0 z-50">
        <div className="max-w-[1440px] mx-auto px-6 h-full flex items-center justify-between">
          
          <Link href={`/${slug}`} className="flex items-center gap-3 group">
            {store?.logo_url ? (
              <div className="relative h-8 w-8 border border-black/10 rounded-sm overflow-hidden">
                <Image 
                  src={store.logo_url} 
                  alt={store.name || "Store Logo"} 
                  fill 
                  className="object-contain"
                  sizes="32px"
                />
              </div>
            ) : (
              <div className="w-8 h-8 bg-black rotate-3 border-[1.5px] border-accent flex items-center justify-center text-[10px] font-black text-white italic transition-transform group-hover:rotate-0">
                B.
              </div>
            )}
            <span className="font-black uppercase italic tracking-tighter text-lg text-black">
              {store?.name || "Booka Store"}<span className="text-accent">.</span>
            </span>
          </Link>

          <div className="flex items-center gap-4 md:gap-6">
            <button className="text-black hover:text-accent transition-colors">
              <Search size={20} />
            </button>
            <Link 
              href="/cart" 
              className="relative p-2 bg-black text-white rounded-full hover:bg-accent hover:text-black transition-all"
            >
              <ShoppingCart size={18} />
            </Link>
          </div>
        </div>
      </nav>

      <main>
        {children}
      </main>
    </div>
  );
}