"use client";

import { Check, ChevronDown, Languages, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePublicTranslation } from "./translation-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const LANGUAGE_OPTIONS = [
  { code: "en", shortLabel: "EN", label: "English", nativeLabel: "English" },
  { code: "fr", shortLabel: "FR", label: "French", nativeLabel: "Français" },
] as const;

export function LanguageSwitcher({
  className,
  compact = false,
  inverted = false,
  dropdownAlign = "end",
}: {
  className?: string;
  compact?: boolean;
  inverted?: boolean;
  dropdownAlign?: "start" | "center" | "end";
}) {
  const { currentLanguage, isReady, isSwitching, setLanguage } = usePublicTranslation();

  const currentOption =
    LANGUAGE_OPTIONS.find((language) => language.code === currentLanguage) ?? LANGUAGE_OPTIONS[0];

  const triggerClassName = cn(
    "inline-flex items-center gap-2 border rounded-[var(--radius)] transition-colors",
    compact ? "h-10 px-2.5 py-2" : "h-11 px-3 py-2.5",
    inverted
      ? "border-white/20 bg-white/5 text-white hover:bg-white/10"
      : "border-black/10 bg-white text-black hover:bg-[#F9F6F0]",
    className
  );

  const codeBadgeClassName = inverted
    ? "border-white/25 bg-white/10 text-white"
    : "border-black/10 bg-[#F7F3EB] text-black";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className={triggerClassName} disabled={isSwitching}>
          {isSwitching ? (
            <Loader2
              size={compact ? 12 : 14}
              className={cn("animate-spin shrink-0", inverted ? "text-white" : "text-black")}
            />
          ) : (
            <Languages
              size={compact ? 12 : 14}
              className={cn("shrink-0", inverted ? "text-white" : "text-black")}
            />
          )}

          <span
            className={cn(
              "font-black uppercase tracking-widest leading-none",
              compact ? "text-[10px]" : "text-[11px]"
            )}
          >
            Language
          </span>

          <span
            className={cn(
              "inline-flex min-w-[30px] items-center justify-center border px-1.5 py-1 text-[9px] font-black uppercase tracking-widest leading-none",
              codeBadgeClassName
            )}
          >
            {currentOption.shortLabel}
          </span>

          <ChevronDown
            size={compact ? 12 : 14}
            className={cn("shrink-0 opacity-60", inverted ? "text-white" : "text-black")}
          />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align={dropdownAlign}
        sideOffset={8}
        className="w-[240px] rounded-none border-2 border-black bg-white p-0 text-black gumroad-shadow-sm"
      >
        <DropdownMenuLabel className="px-3 py-3">
          <p className="text-[10px] font-black uppercase tracking-widest opacity-45">
            Change Language
          </p>
          <p className="mt-1 text-xs font-bold">Changer de Langue</p>
        </DropdownMenuLabel>

        <DropdownMenuSeparator className="m-0 bg-black/10" />

        {LANGUAGE_OPTIONS.map((language) => {
          const isDisabled = isSwitching || (!isReady && language.code !== "en");
          const isActive = currentLanguage === language.code;

          return (
            <DropdownMenuItem
              key={language.code}
              disabled={isDisabled}
              onSelect={() => setLanguage(language.code)}
              className="flex items-center gap-3 rounded-none px-3 py-3 focus:bg-accent/15"
              title={
                language.code !== "en" && !isReady
                  ? "Translation is still loading"
                  : undefined
              }
            >
              <span
                className={cn(
                  "inline-flex min-w-[34px] items-center justify-center border px-1.5 py-1 text-[10px] font-black uppercase tracking-widest leading-none",
                  isActive
                    ? "border-black bg-black text-white"
                    : "border-black/10 bg-[#F7F3EB] text-black/70"
                )}
              >
                {language.shortLabel}
              </span>

              <div className="flex min-w-0 flex-1 flex-col leading-none">
                <span className="text-sm font-black">{language.label}</span>
                <span className="mt-1 text-[11px] font-medium text-black/55">
                  {language.nativeLabel}
                </span>
              </div>

              {isActive && <Check size={14} className="shrink-0 text-black" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
