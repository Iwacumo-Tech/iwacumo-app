"use client";

import Link from "next/link";
import { usePathname } from "next/navigation"; 
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface SidebarItemProps {
  href?: string;
  name: string;
  icon?: ReactNode;
  className?: string;
  onClick?: () => void;
  [key: string]: any; 
}

export function SidebarItem({ href, name, icon, className, onClick, ...props }: SidebarItemProps) {
  const pathname = usePathname();
  const isActive = href ? pathname === href : false;

  const content = (
    <div className="w-full flex flex-row justify-start items-center gap-3 font-black uppercase italic text-xs tracking-widest">
      <span className={cn(isActive ? "text-black" : "opacity-50")}>{icon}</span>
      {name}
    </div>
  );

  return (
    <Button
      variant="ghost"
      onClick={onClick} 
      className={cn(
        "w-full h-12 justify-start rounded-none border-2 border-transparent transition-all",
        isActive ? "bg-accent text-black border-black translate-x-1 -translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" : "hover:bg-accent/10",
        className
      )}
    >
      {href ? (
        <Link href={href} className="w-full h-full flex items-center">
          {content}
        </Link>
      ) : (
        content
      )}
    </Button>
  );
}