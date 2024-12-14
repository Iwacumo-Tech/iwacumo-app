"use client";

import Link from "next/link";
import React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SidebarItemProps extends React.HTMLAttributes<HTMLAnchorElement> {
  href?: string;
  icon: React.ReactNode;
  name: string;
  className?: string;
  onClick?: () => void;
}

export function SidebarItem ({
  href,
  name,
  icon,
  className,
  onClick,
  ...props
}: SidebarItemProps) {
  return (
    <Button
      variant={"ghost"}
      className="w-full"
      onClick={onClick}
    >
      {
        href ? (
          <Link
            {...props}
            className={cn(
              "w-full flex flex-row justify-start items-center",
              className
            )}
            href={href}
          >
            {icon}
            {name}
          </Link>
        ) : (
          <div
            className={cn(
              "w-full flex flex-row justify-start items-center",
              className
            )}
          >
            {icon}
            {name}
          </div>
        )
      }
    </Button>

  );
}
