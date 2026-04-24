"use client";

import { Languages, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePublicTranslation } from "./translation-provider";

export function LanguageSwitcher({
  className,
  compact = false,
  inverted = false,
}: {
  className?: string;
  compact?: boolean;
  inverted?: boolean;
}) {
  const { currentLanguage, isReady, isSwitching, setLanguage } = usePublicTranslation();

  const baseButtonClass = inverted
    ? "border-white/30 text-white/80 hover:text-white"
    : "border-black/20 text-black/60 hover:text-black";

  const activeButtonClass = inverted
    ? "bg-white text-black border-white"
    : "bg-black text-white border-black";

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 border rounded-[var(--radius)] px-2 py-1.5",
        inverted ? "border-white/20 bg-white/5" : "border-black/10 bg-white",
        className
      )}
    >
      {isSwitching ? (
        <Loader2 size={compact ? 12 : 14} className={cn("animate-spin", inverted ? "text-white" : "text-black")} />
      ) : (
        <Languages size={compact ? 12 : 14} className={inverted ? "text-white" : "text-black"} />
      )}

      <div className="inline-flex items-center gap-1">
        {(["en", "fr"] as const).map((language) => (
          <button
            key={language}
            type="button"
            onClick={() => setLanguage(language)}
            disabled={isSwitching || (!isReady && language === "fr")}
            className={cn(
              "min-w-[38px] border px-2 py-1 text-[10px] font-black uppercase tracking-widest transition-colors disabled:cursor-not-allowed disabled:opacity-50",
              baseButtonClass,
              currentLanguage === language && activeButtonClass
            )}
            title={language === "fr" && !isReady ? "Translation is still loading" : undefined}
          >
            {language}
          </button>
        ))}
      </div>
    </div>
  );
}

