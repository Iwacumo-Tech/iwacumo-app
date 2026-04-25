"use client";

import Script from "next/script";
import { useEffect } from "react";

const TAWK_SRC = "https://embed.tawk.to/69ecb750b8db171c34316888/1jn2ao5a6";
const TAWK_SCRIPT_ID = "tawk-chat-script";

declare global {
  interface Window {
    Tawk_API?: {
      hideWidget?: () => void;
      showWidget?: () => void;
      shutdown?: () => void;
      onLoad?: () => void;
    };
    Tawk_LoadStart?: Date;
    __IWACUMO_TAWK_LOADED__?: boolean;
  }
}

function cleanupTawkArtifacts() {
  if (typeof document === "undefined") return;

  document.querySelectorAll(`script[src="${TAWK_SRC}"]`).forEach((node) => node.remove());
  document
    .querySelectorAll('iframe[src*="tawk.to"], iframe[title*="chat" i], iframe[title*="tawk" i]')
    .forEach((node) => node.remove());
  document
    .querySelectorAll('div[id*="tawk" i], div[class*="tawk" i]')
    .forEach((node) => {
      if (node.childElementCount > 0 || node.textContent?.trim()) {
        node.remove();
      }
    });
}

export function TawkChat() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    window.Tawk_API = window.Tawk_API || {};
    window.Tawk_LoadStart = new Date();

    if (window.__IWACUMO_TAWK_LOADED__) {
      window.Tawk_API?.showWidget?.();
    }

    return () => {
      window.Tawk_API?.hideWidget?.();
      window.Tawk_API?.shutdown?.();
      window.__IWACUMO_TAWK_LOADED__ = false;
      cleanupTawkArtifacts();
    };
  }, []);

  return (
    <Script
      id={TAWK_SCRIPT_ID}
      src={TAWK_SRC}
      strategy="afterInteractive"
      charSet="UTF-8"
      crossOrigin="anonymous"
      onLoad={() => {
        if (typeof window === "undefined") return;
        window.__IWACUMO_TAWK_LOADED__ = true;
      }}
    />
  );
}
