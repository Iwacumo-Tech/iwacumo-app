"use client";

import Image from "next/image";
import Link from "next/link";
import { BookOpen, RotateCw, WifiOff } from "lucide-react";

export default function OfflineContent() {
  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white border-4 border-black gumroad-shadow p-8 sm:p-10 text-center">
        <div className="relative w-20 h-20 mx-auto mb-6 border-2 border-black rounded-2xl overflow-hidden">
          <Image
            src="/icons/v2/icon-192x192.png"
            alt="Iwacumo"
            fill
            className="object-cover"
            priority
          />
        </div>

        <div className="flex items-center justify-center gap-2 mb-4">
          <WifiOff size={20} className="text-amber-600" />
          <h1 className="text-3xl font-black uppercase italic tracking-tighter">
            You&apos;re offline<span className="text-accent">.</span>
          </h1>
        </div>

        <p className="text-sm font-medium text-gray-500">
          This page needs an internet connection. Reconnect to continue browsing —
          your downloaded books are still available.
        </p>

        <div className="mt-8 space-y-3">
          <Link
            href="/app/books"
            className="flex h-14 items-center justify-center gap-2 rounded-none border-2 border-black bg-black px-8 text-sm font-black uppercase italic tracking-widest text-white hover:bg-accent hover:text-black transition-colors"
          >
            <BookOpen size={16} /> Go to Library
          </Link>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-none border-2 border-black bg-white px-8 text-xs font-black uppercase italic tracking-widest hover:bg-black/5 transition-colors"
          >
            <RotateCw size={14} /> Try Again
          </button>
        </div>
      </div>

      <p className="mt-6 text-center text-[11px] font-medium text-gray-400">
        Tip: download books while online to read them anywhere.
      </p>
    </div>
  );
}
