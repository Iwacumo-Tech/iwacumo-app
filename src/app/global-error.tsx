"use client";

import { useEffect } from "react";
import { AlertTriangle, BookOpen, RotateCw, WifiOff } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error boundary caught:", error);
  }, [error]);

  const goToLibrary = () => {
    window.location.href = "/app/books";
  };

  const goOffline = () => {
    window.location.href = "/offline";
  };

  // Chunk-load failures mean the cached document references JS from a
  // different deployment. Re-rendering (reset) can never fix that — only
  // a full reload, which re-fetches a consistent document + chunks.
  const isChunkError =
    /Loading chunk \d+ failed/i.test(error?.message ?? "") ||
    /ChunkLoadError/i.test(error?.message ?? "") ||
    /Failed to fetch dynamically imported module/i.test(error?.message ?? "");

  const reloadApp = () => {
    window.location.reload();
  };

  return (
    <html lang="en">
      <body>
        <div className="min-h-screen bg-[#FAF9F6] py-12 px-4">
          <div className="max-w-md mx-auto">
            <div className="bg-white border-4 border-black gumroad-shadow p-8 sm:p-10 text-center">
              <div className="w-16 h-16 bg-red-50 border-[1.5px] border-red-200 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertTriangle size={28} className="text-red-500" />
              </div>

              <h1 className="text-3xl font-black uppercase italic tracking-tighter mb-4">
                Something went wrong<span className="text-accent">.</span>
              </h1>

              <p className="text-sm font-medium text-gray-500">
                {isChunkError
                  ? "The app was updated and some files are out of sync. Reloading fetches the latest version."
                  : "The app hit an unexpected error. Your downloaded books and reading progress are safe."}
              </p>

              {error?.message && (
                <div className="mt-4 p-3 border-[1.5px] border-black/10 bg-[#F9F6F0] rounded text-left">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">
                    Error details
                  </p>
                  <p className="text-xs font-mono break-words text-black/70">
                    {error.message}
                    {error.digest ? ` (${error.digest})` : ""}
                  </p>
                </div>
              )}

              <div className="mt-8 space-y-3">
                <button
                  type="button"
                  onClick={isChunkError ? reloadApp : () => reset()}
                  className="flex h-14 w-full items-center justify-center gap-2 rounded-none border-2 border-black bg-black px-8 text-sm font-black uppercase italic tracking-widest text-white hover:bg-accent hover:text-black transition-colors"
                >
                  <RotateCw size={16} /> {isChunkError ? "Reload App" : "Try Again"}
                </button>
                <button
                  type="button"
                  onClick={goToLibrary}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-none border-2 border-black bg-white px-8 text-xs font-black uppercase italic tracking-widest hover:bg-black/5 transition-colors"
                >
                  <BookOpen size={16} /> Go to Library
                </button>
                <button
                  type="button"
                  onClick={goOffline}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-none border-2 border-black bg-white px-8 text-xs font-black uppercase italic tracking-widest hover:bg-black/5 transition-colors"
                >
                  <WifiOff size={16} /> Offline Page
                </button>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
