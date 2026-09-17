"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { trpc } from "@/app/_providers/trpc-provider";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Download, Loader2, WifiOff, X } from "lucide-react";
import {
  getRemainingOfflineSlots,
  hasAutoDownloadRun,
  markAutoDownloadDone,
  runAutoDownload,
  selectBooksForAutoDownload,
} from "@/lib/auto-download";
import { getDownloadedBooks } from "@/lib/offline-manager";

function isStandalone() {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  return (window.navigator as any).standalone === true;
}

export default function AutoDownloadManager() {
  const { data: session } = useSession();
  const utils = trpc.useUtils();
  const { toast } = useToast();

  const [running, setRunning] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [currentTitle, setCurrentTitle] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [total, setTotal] = useState(0);
  const [failed, setFailed] = useState<Array<{ id: string; title: string }>>([]);
  const [finished, setFinished] = useState(false);
  const runningRef = useRef(false);
  const failedRef = useRef<Array<{ id: string; title: string }>>([]);

  const run = useCallback(
    async (retryFailedOnly = false) => {
      if (runningRef.current) return;
      if (typeof window === "undefined" || !navigator.onLine) return;
      const userId = (session?.user as any)?.id as string | undefined;
      if (!userId) return;
      if (!retryFailedOnly && hasAutoDownloadRun()) return;

      runningRef.current = true;
      setRunning(true);
      setDismissed(false);
      setFinished(false);
      setFailed([]);

      try {
        const [purchased, downloaded, remaining] = await Promise.all([
          utils.getPurchasedBooksByCustomer.fetch({ id: userId }),
          getDownloadedBooks(),
          getRemainingOfflineSlots(),
        ]);

        const downloadedIds = new Set(downloaded.map((b) => b.id));
        let candidates = selectBooksForAutoDownload(purchased ?? [], downloadedIds, remaining);

        if (retryFailedOnly && failedRef.current.length > 0) {
          const retryIds = new Set(failedRef.current.map((f) => f.id));
          candidates = candidates.filter((c) => retryIds.has(c.id));
        }

        if (candidates.length === 0) {
          markAutoDownloadDone();
          return;
        }

        setTotal(candidates.length);

        const result = await runAutoDownload(utils as any, candidates, {
          onBookStart: (book, index) => {
            setCurrentTitle(book.title);
            setCurrentIndex(index + 1);
          },
        });

        failedRef.current = result.failed;
        setFailed(result.failed);
        markAutoDownloadDone();

        if (result.failed.length === 0) {
          toast({
            title: "Library ready offline",
            description:
              result.succeeded.length === 1
                ? "1 book downloaded for offline reading."
                : `${result.succeeded.length} books downloaded for offline reading.`,
          });
        } else {
          toast({
            title: "Offline setup incomplete",
            variant: "destructive",
            description: `${result.succeeded.length} downloaded, ${result.failed.length} failed: ${result.failed
              .slice(0, 3)
              .map((f) => f.title)
              .join(", ")}${result.failed.length > 3 ? "…" : ""}`,
          });
        }
      } catch (error) {
        toast({
          title: "Offline setup failed",
          variant: "destructive",
          description: error instanceof Error ? error.message : "Could not prepare offline library.",
        });
        markAutoDownloadDone();
      } finally {
        runningRef.current = false;
        setRunning(false);
        setFinished(true);
      }
    },
    [session, utils, toast]
  );

  // Trigger: browser install event + first standalone launch (covers iOS)
  useEffect(() => {
    const onInstalled = () => {
      run(false);
    };
    window.addEventListener("appinstalled", onInstalled);
    if (isStandalone()) {
      run(false);
    }
    return () => {
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [run]);

  const showBanner = (running || (finished && failed.length > 0)) && !dismissed;

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white border-2 border-black rounded-lg shadow-lg p-4 z-40">
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-2 right-2 p-1 hover:bg-gray-100 rounded"
        aria-label="Dismiss"
      >
        <X size={16} />
      </button>

      <div className="flex items-start gap-3">
        <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center shrink-0">
          {running ? (
            <Loader2 size={24} className="text-accent animate-spin" />
          ) : (
            <WifiOff size={24} className="text-accent" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-black uppercase italic text-sm mb-1">
            {running ? "Preparing offline library" : "Some books failed"}
          </h3>
          {running ? (
            <p className="text-xs text-gray-600 mb-3 truncate">
              {currentTitle ? `${currentIndex}/${total} · ${currentTitle}` : "Starting…"}
            </p>
          ) : (
            <p className="text-xs text-gray-600 mb-3">
              {failed.length} book{failed.length === 1 ? "" : "s"} couldn&apos;t be downloaded.
            </p>
          )}

          {!running && failed.length > 0 && (
            <Button
              onClick={() => run(true)}
              className="h-10 px-4 text-xs font-black uppercase italic tracking-widest"
            >
              <Download size={14} className="mr-2" /> Retry
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
