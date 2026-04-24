"use client";

import { useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ChevronDown, Loader2, UserRound, BookOpen, Building2, Shield } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  DashboardProfile,
  PROFILE_LABELS,
  setActiveProfileCookie,
} from "@/lib/profile-mode";
import { cn } from "@/lib/utils";

const PROFILE_ICONS = {
  staff: Shield,
  publisher: Building2,
  author: BookOpen,
  reader: UserRound,
} satisfies Record<DashboardProfile, React.ElementType>;

export function ProfileSwitcher() {
  const router = useRouter();
  const { data: session, update } = useSession();
  const [isPending, startTransition] = useTransition();

  const availableProfiles = useMemo(
    () => (session?.availableProfiles ?? []).filter(Boolean),
    [session?.availableProfiles]
  );

  const activeProfile = (session?.activeProfile ?? null) as DashboardProfile | null;

  if (!activeProfile) return null;

  const ActiveIcon = PROFILE_ICONS[activeProfile];
  const activeLabel = PROFILE_LABELS[activeProfile];
  const canSwitch = availableProfiles.length > 1;

  const handleSwitch = (profile: DashboardProfile) => {
    if (profile === activeProfile) return;

    startTransition(() => {
      setActiveProfileCookie(profile);
      void update().finally(() => {
        router.replace("/app");
        router.refresh();
      });
    });
  };

  if (!canSwitch) {
    return (
      <div className="flex items-center gap-2 rounded-none border-2 border-black bg-white px-3 py-2">
        <ActiveIcon className="size-4 text-black" />
        <span className="text-[10px] font-black uppercase tracking-widest text-black sm:text-[11px]">
          {activeLabel}
        </span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-none border-2 border-black bg-white px-3 py-2 text-black transition-colors hover:bg-accent"
          disabled={isPending}
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ActiveIcon className="size-4" />
          )}
          <span className="max-w-[132px] truncate text-[10px] font-black uppercase tracking-widest sm:max-w-[170px] sm:text-[11px]">
            {activeLabel}
          </span>
          <ChevronDown className="size-4 opacity-60" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-64 rounded-none border-[1.5px] border-black bg-white p-0"
      >
        {availableProfiles.map((profile) => {
          const Icon = PROFILE_ICONS[profile];

          return (
            <DropdownMenuItem
              key={profile}
              onClick={() => handleSwitch(profile)}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-none px-4 py-3 text-sm font-black uppercase tracking-wide",
                profile === activeProfile ? "bg-accent/30" : "hover:bg-accent/10"
              )}
            >
              <Icon className="size-4 shrink-0" />
              <span className="truncate">{PROFILE_LABELS[profile]}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
