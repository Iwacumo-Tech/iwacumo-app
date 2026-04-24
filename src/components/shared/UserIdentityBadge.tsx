"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

interface UserIdentityBadgeProps {
  username?: string | null;
  avatarUrl?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  className?: string;
  avatarClassName?: string;
  nameClassName?: string;
  hideNameOnMobile?: boolean;
}

function getInitials({
  username,
  firstName,
  lastName,
}: {
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}) {
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();

  if (fullName) {
    const parts = fullName.split(/\s+/).slice(0, 2);
    return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
  }

  if (username) {
    return username.replace(/^@/, "").slice(0, 2).toUpperCase();
  }

  return "U";
}

export function UserIdentityBadge({
  username,
  avatarUrl,
  firstName,
  lastName,
  className,
  avatarClassName,
  nameClassName,
  hideNameOnMobile = false,
}: UserIdentityBadgeProps) {
  const resolvedUsername = username?.replace(/^@/, "") || "user";
  const initials = getInitials({ username: resolvedUsername, firstName, lastName });

  return (
    <div className={cn("flex items-center gap-3 min-w-0", className)}>
      <div
        className={cn(
          "relative size-10 shrink-0 overflow-hidden rounded-full border-2 border-black bg-accent",
          avatarClassName
        )}
      >
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={`@${resolvedUsername}`}
            fill
            className="object-cover"
            sizes="40px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[11px] font-black uppercase tracking-wide text-black">
            {initials}
          </div>
        )}
      </div>

      <div
        className={cn(
          "min-w-0",
          hideNameOnMobile && "hidden sm:block"
        )}
      >
        <p
          className={cn(
            "truncate text-[11px] font-black uppercase tracking-widest text-primary",
            nameClassName
          )}
          title={`@${resolvedUsername}`}
        >
          @{resolvedUsername}
        </p>
      </div>
    </div>
  );
}
