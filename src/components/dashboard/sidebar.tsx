"use client";

import { IoLogOutOutline } from "react-icons/io5";
import { SidebarItem } from "./sidebar-item";
import { type Link } from "./dashboard-shell";
import { ExternalLink, Book, Store } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Sidebar({ logout, links, storeSlug, setIsOpen }: {
  links: any[];
  logout: () => void;
  storeSlug?: string | null;
  setIsOpen?: (val: boolean) => void;
}) {

  const handleItemClick = () => {
    if (setIsOpen) setIsOpen(false);
  };

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Header */}
      <div className="px-6 py-8 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-black flex items-center justify-center rotate-3 border-2 border-accent">
            <Book className="text-white w-6 h-6" />
          </div>
          <span className="text-2xl font-black uppercase italic tracking-tighter">
            Booka<span className="text-accent">.</span>
          </span>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 overflow-y-auto px-4 space-y-2 no-scrollbar">
        {links.map((item, i) => (
          <SidebarItem
            key={i}
            href={item.url}
            name={item.name}
            icon={item.icon}
            onClick={handleItemClick}
            className="font-black uppercase italic text-xs tracking-widest h-12"
          />
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 space-y-2 border-t-4 border-black shrink-0 bg-white">
        {/* Publisher store shortcut — only shown when a slug is available */}
        {storeSlug && (
          <SidebarItem
            name="View My Store"
            href={`/${storeSlug}`}
            icon={<Store className="w-4 h-4" />}
            onClick={handleItemClick}
            className="text-black font-bold uppercase text-[10px] bg-accent/10 hover:bg-accent hover:text-black border-[1.5px] border-accent/40 hover:border-accent"
          />
        )}

        <SidebarItem
          name="Marketplace"
          href="/shop"
          icon={<ExternalLink className="w-4 h-4" />}
          onClick={handleItemClick}
          className="text-black opacity-60 hover:opacity-100 font-bold uppercase text-[10px]"
        />

        <Button
          variant="ghost"
          onClick={logout}
          className="w-full h-12 justify-start gap-3 text-red-600 font-black uppercase italic text-xs hover:bg-red-50 rounded-none"
        >
          <IoLogOutOutline className="w-5 h-5" />
          Logout
        </Button>
      </div>
    </div>
  );
}