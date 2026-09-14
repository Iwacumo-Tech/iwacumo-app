"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Download, Loader2, RefreshCw, Share, Smartphone } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Status =
  | "checking"
  | "update-available"
  | "installable"
  | "ios-instructions"
  | "unsupported"
  | "up-to-date"
  | "unknown";

function isIosDevice() {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua)) return true;
  // iPadOS 13+ reports as Macintosh — detect via touch support
  return /Macintosh/i.test(ua) && window.navigator.maxTouchPoints > 1;
}

function isInstalledApp() {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  return (window.navigator as any).standalone === true;
}

// `navigator.serviceWorker.ready` never settles when the current page is
// outside the worker's scope (e.g. /install vs the /app scope), so race it
// against a timeout instead of awaiting it blindly.
const SW_CHECK_TIMEOUT_MS = 6000;

async function getRegistrationWithTimeout(): Promise<{
  reg: ServiceWorkerRegistration | null;
  timedOut: boolean;
}> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return { reg: null, timedOut: false };
  }
  try {
    const reg = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), SW_CHECK_TIMEOUT_MS)),
    ]);
    if (!reg) return { reg: null, timedOut: true };
    try {
      await Promise.race([
        reg.update(),
        new Promise((resolve) => setTimeout(resolve, SW_CHECK_TIMEOUT_MS)),
      ]);
    } catch {
      // Update failure is non-fatal — the registration itself is still usable
    }
    return { reg, timedOut: false };
  } catch {
    return { reg: null, timedOut: false };
  }
}

export default function AppInstallManager() {
  const [status, setStatus] = useState<Status>("checking");
  const [updating, setUpdating] = useState(false);
  const [justInstalled, setJustInstalled] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);
  const registration = useRef<ServiceWorkerRegistration | null>(null);

  const checkForUpdate = useCallback(async () => {
    setStatus("checking");

    const installed = isInstalledApp();

    // Capture install prompt if the browser fires it
    // (listener is attached once below; this just re-evaluates state)
    const { reg, timedOut } = await getRegistrationWithTimeout();
    if (reg) {
      registration.current = reg;
      if (reg.waiting) {
        setStatus("update-available");
        setLastChecked(new Date());
        return;
      }
    }

    if (timedOut) {
      // Couldn't reach the update service (e.g. this page is outside the
      // worker's scope) — say so honestly instead of spinning forever.
      setStatus("unknown");
      setLastChecked(new Date());
      return;
    }

    if (installed) {
      setStatus("up-to-date");
      setLastChecked(new Date());
    } else if (deferredPrompt.current) {
      setStatus("installable");
    } else if (isIosDevice()) {
      setStatus("ios-instructions");
    } else {
      setStatus("unsupported");
    }
  }, []);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
      setStatus((current) => (current === "checking" || current === "unsupported" ? "installable" : current));
    };

    const onUpdateFound = () => {
      const reg = registration.current;
      const worker = reg?.installing;
      if (!worker) return;
      worker.addEventListener("statechange", () => {
        if (worker.state === "installed" && navigator.serviceWorker.controller) {
          setStatus("update-available");
          setLastChecked(new Date());
        }
      });
    };

    window.addEventListener("beforeinstallprompt", onPrompt);

    // Attach update listener once registration is known (same timeout
    // guard as the main check — ready alone can hang forever here)
    let cancelled = false;
    getRegistrationWithTimeout().then(({ reg }) => {
      if (cancelled || !reg) return;
      registration.current = reg;
      reg.addEventListener("updatefound", onUpdateFound);
    });

    checkForUpdate();

    return () => {
      cancelled = true;
      window.removeEventListener("beforeinstallprompt", onPrompt);
    };
  }, [checkForUpdate]);

  const handleInstall = async () => {
    const promptEvent = deferredPrompt.current;
    if (!promptEvent) return;
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    deferredPrompt.current = null;
    if (outcome === "accepted") {
      setJustInstalled(true);
    } else {
      setStatus("unsupported");
    }
  };

  const handleUpdate = () => {
    const waiting = registration.current?.waiting;
    if (!waiting) {
      checkForUpdate();
      return;
    }
    setUpdating(true);
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      () => window.location.reload(),
      { once: true }
    );
    waiting.postMessage("SKIP_WAITING");
    // Safety net: release the spinner if the reload never comes
    setTimeout(() => setUpdating(false), 10000);
  };

  if (status === "checking") {
    return (
      <div className="flex items-center justify-center gap-3 py-10">
        <Loader2 size={20} className="animate-spin opacity-40" />
        <p className="text-xs font-black uppercase tracking-widest opacity-40">Checking app status…</p>
      </div>
    );
  }

  if (justInstalled) {
    return (
      <div className="border-2 border-black bg-green-50 p-6 text-center">
        <CheckCircle2 size={28} className="mx-auto mb-3 text-green-600" />
        <p className="font-black uppercase italic text-sm">Installed successfully</p>
        <p className="mt-2 text-xs font-medium text-black/60">
          Open Iwacumo from your home screen to start reading.
        </p>
      </div>
    );
  }

  if (status === "update-available") {
    return (
      <div className="border-2 border-amber-300 bg-amber-50 p-6 text-center">
        <RefreshCw size={28} className="mx-auto mb-3 text-amber-600" />
        <p className="font-black uppercase italic text-sm">A new version is ready</p>
        <p className="mt-2 text-xs font-medium text-black/60">
          Update now to get the latest features and fixes.
        </p>
        <Button
          onClick={handleUpdate}
          disabled={updating}
          className="mt-4 h-12 px-8 rounded-none border-2 border-black bg-black text-white font-black uppercase italic text-xs tracking-widest hover:bg-accent hover:text-black disabled:opacity-50"
        >
          {updating ? (
            <>
              <Loader2 size={14} className="mr-2 animate-spin" /> Updating…
            </>
          ) : (
            <>
              <RefreshCw size={14} className="mr-2" /> Update App
            </>
          )}
        </Button>
      </div>
    );
  }

  if (status === "up-to-date") {
    return (
      <div className="border-2 border-black bg-green-50 p-6 text-center">
        <CheckCircle2 size={28} className="mx-auto mb-3 text-green-600" />
        <p className="font-black uppercase italic text-sm">You&apos;re on the latest version</p>
        <p className="mt-2 text-xs font-medium text-black/60">
          {lastChecked
            ? `Last checked ${lastChecked.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`
            : "No update available."}
        </p>
        <Button
          onClick={checkForUpdate}
          variant="outline"
          className="mt-4 h-11 px-6 rounded-none border-2 border-black font-black uppercase italic text-xs tracking-widest"
        >
          <RefreshCw size={14} className="mr-2" /> Check again
        </Button>
      </div>
    );
  }

  if (status === "unknown") {
    return (
      <div className="border-2 border-black bg-[#F9F6F0] p-6 text-center">
        <Smartphone size={28} className="mx-auto mb-3 opacity-40" />
        <p className="font-black uppercase italic text-sm">Couldn&apos;t verify the version</p>
        <p className="mt-2 text-xs font-medium text-black/60">
          We couldn&apos;t reach the app&apos;s update service from this page. Open the installed
          app once to pick up updates — or remove and reinstall it.
        </p>
        <Button
          onClick={checkForUpdate}
          variant="outline"
          className="mt-4 h-11 px-6 rounded-none border-2 border-black font-black uppercase italic text-xs tracking-widest"
        >
          <RefreshCw size={14} className="mr-2" /> Check again
        </Button>
      </div>
    );
  }

  if (status === "installable") {
    return (
      <div className="text-center">
        <Button
          onClick={handleInstall}
          className="h-14 px-10 rounded-none border-2 border-black bg-black text-white font-black uppercase italic text-sm tracking-widest hover:bg-accent hover:text-black"
        >
          <Download size={16} className="mr-2" /> Install App
        </Button>
        <p className="mt-3 text-[11px] font-medium text-black/50">
          Free · Works offline · ~5 MB
        </p>
      </div>
    );
  }

  if (status === "ios-instructions") {
    return (
      <div className="border-2 border-black bg-white p-6">
        <p className="font-black uppercase italic text-sm flex items-center justify-center gap-2">
          <Share size={16} /> Add to Home Screen
        </p>
        <ol className="mt-4 space-y-3 text-left">
          {[
            "Tap the Share button in Safari's toolbar",
            "Scroll down and tap “Add to Home Screen”",
            "Tap “Add” in the top-right corner",
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="h-6 w-6 shrink-0 bg-black text-white flex items-center justify-center font-black text-xs">
                {i + 1}
              </span>
              <span className="text-sm font-medium">{step}</span>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  return (
    <div className="border-2 border-black bg-[#F9F6F0] p-6 text-center">
      <Smartphone size={28} className="mx-auto mb-3 opacity-40" />
      <p className="font-black uppercase italic text-sm">Install from a supported browser</p>
      <p className="mt-2 text-xs font-medium text-black/60">
        Open this page in Chrome or Edge on Android or desktop, then use the browser menu → Install.
      </p>
      <Button
        onClick={checkForUpdate}
        variant="outline"
        className="mt-4 h-11 px-6 rounded-none border-2 border-black font-black uppercase italic text-xs tracking-widest"
      >
        <RefreshCw size={14} className="mr-2" /> Check again
      </Button>
    </div>
  );
}
