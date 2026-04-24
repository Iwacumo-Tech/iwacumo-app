"use client";

import Image from "next/image";
import { IoLogOutOutline } from "react-icons/io5";
import { SidebarItem } from "./sidebar-item";
import { type Link } from "./dashboard-shell";
import { ExternalLink, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";
import { UserIdentityBadge } from "@/components/shared/UserIdentityBadge";
import { LanguageSwitcher } from "@/components/shared/language-switcher";

export function Sidebar({ logout, links, storeSlug, setIsOpen }: {
  links:      any[];
  logout:     () => void;
  storeSlug?: string | null;
  setIsOpen?: (val: boolean) => void;
}) {
  const { data: session } = useSession();

  const handleItemClick = () => {
    if (setIsOpen) setIsOpen(false);
  };

  return (
    <div className="flex h-full flex-col bg-white">

      {/* ── Header / Logo ─────────────────────────────────────────────── */}
      <div className="px-6 py-6 shrink-0 border-b-4 border-black bg-black">
        <Image
          src="/yellow-logo.png"
          alt="iwacumò"
          width={160}
          height={48}
          priority
          className="object-contain"
        />
      </div>

      {/* ── Main Navigation ───────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1 no-scrollbar">
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

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <div className="p-4 space-y-2 border-t-4 border-black shrink-0 bg-white">
        {session?.user && (
          <div className="mb-3 rounded-[var(--radius)] border-[1.5px] border-black px-3 py-3">
            <p className="mb-2 text-[9px] font-black uppercase tracking-widest opacity-35">Signed In</p>
            <UserIdentityBadge
              username={session.user.username}
              avatarUrl={session.user.avatar_url}
              firstName={session.user.first_name}
              lastName={session.user.last_name}
              className="w-full"
              avatarClassName="size-10"
              nameClassName="text-[10px]"
            />
          </div>
        )}

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

        <div className="pt-1">
          <p className="mb-2 text-[9px] font-black uppercase tracking-widest opacity-35">Language</p>
          <LanguageSwitcher className="w-full justify-between bg-[#F9F6F0]" />
        </div>

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
