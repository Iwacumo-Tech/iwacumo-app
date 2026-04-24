"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "iwacumo-public-language";
const COOKIE_NAME = "googtrans";
const SCRIPT_ID = "iwacumo-google-translate-script";
const PENDING_KEY = "iwacumo-public-language-pending";

type PublicLanguage = "en" | "fr";

type TranslationContextValue = {
  currentLanguage: PublicLanguage;
  isReady: boolean;
  isSwitching: boolean;
  setLanguage: (language: PublicLanguage) => void;
};

const TranslationContext = createContext<TranslationContextValue | null>(null);

declare global {
  interface Window {
    google?: any;
    googleTranslateElementInit?: () => void;
  }
}

function writeCookie(cookieValue: string, maxAge: number, domain?: string) {
  if (typeof document === "undefined") return;

  const domainPart = domain ? `;domain=${domain}` : "";
  document.cookie = `${COOKIE_NAME}=${cookieValue};path=/;max-age=${maxAge}${domainPart}`;
}

function clearTranslateCookie() {
  if (typeof window === "undefined") return;

  const hostname = window.location.hostname;
  const hostnameParts = hostname.split(".").filter(Boolean);
  const baseDomain =
    hostnameParts.length > 1 ? `.${hostnameParts.slice(-2).join(".")}` : undefined;

  writeCookie("", 0);
  writeCookie("", 0, hostname);
  if (baseDomain) {
    writeCookie("", 0, baseDomain);
  }
}

function setTranslateCookie(language: PublicLanguage) {
  if (typeof window === "undefined") return;

  if (language === "en") {
    clearTranslateCookie();
    return;
  }

  const hostname = window.location.hostname;
  const hostnameParts = hostname.split(".").filter(Boolean);
  const baseDomain =
    hostnameParts.length > 1 ? `.${hostnameParts.slice(-2).join(".")}` : undefined;

  writeCookie("/en/fr", 31536000);
  writeCookie("/en/fr", 31536000, hostname);
  if (baseDomain) {
    writeCookie("/en/fr", 31536000, baseDomain);
  }
}

function readStoredLanguage(): PublicLanguage {
  if (typeof window === "undefined") return "en";
  const storedLanguage = window.localStorage.getItem(STORAGE_KEY);
  return storedLanguage === "fr" ? "fr" : "en";
}

export function PublicTranslationProvider({ children }: { children: ReactNode }) {
  const [currentLanguage, setCurrentLanguage] = useState<PublicLanguage>("en");
  const [isReady, setIsReady] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);

  useEffect(() => {
    const storedLanguage = readStoredLanguage();
    setCurrentLanguage(storedLanguage);
    setTranslateCookie(storedLanguage);
    setIsSwitching(window.localStorage.getItem(PENDING_KEY) === "true");

    window.googleTranslateElementInit = () => {
      try {
        const googleTranslate = window.google?.translate?.TranslateElement;
        if (!googleTranslate) {
          setIsReady(false);
          setIsSwitching(false);
          return;
        }

        const container = document.getElementById("google_translate_element");
        if (container && container.childElementCount === 0) {
          new googleTranslate(
            {
              pageLanguage: "en",
              includedLanguages: "fr",
              autoDisplay: false,
            },
            "google_translate_element"
          );
        }

        window.localStorage.removeItem(PENDING_KEY);
        setIsReady(true);
        setIsSwitching(false);
      } catch {
        window.localStorage.removeItem(PENDING_KEY);
        setIsReady(false);
        setIsSwitching(false);
      }
    };

    const existingScript = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existingScript) {
      if (window.google?.translate?.TranslateElement) {
        window.googleTranslateElementInit?.();
      }
      return;
    }

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    script.async = true;
    script.onload = () => {
      if (window.google?.translate?.TranslateElement) {
        window.googleTranslateElementInit?.();
      }
    };
    script.onerror = () => {
      window.localStorage.removeItem(PENDING_KEY);
      setIsReady(false);
      setIsSwitching(false);
    };
    document.body.appendChild(script);
  }, []);

  const value = useMemo<TranslationContextValue>(() => ({
    currentLanguage,
    isReady,
    isSwitching,
    setLanguage: (language) => {
      if (typeof window === "undefined") return;
      if (language === currentLanguage && !isSwitching) return;

      window.localStorage.setItem(STORAGE_KEY, language);
      window.localStorage.setItem(PENDING_KEY, "true");
      setTranslateCookie(language);
      setCurrentLanguage(language);
      setIsSwitching(true);
      window.location.reload();
    },
  }), [currentLanguage, isReady, isSwitching]);

  return (
    <TranslationContext.Provider value={value}>
      {children}
      <div
        id="google_translate_element"
        className="notranslate"
        style={{ position: "absolute", left: "-9999px", width: "1px", height: "1px", overflow: "hidden" }}
      />
    </TranslationContext.Provider>
  );
}

export function usePublicTranslation() {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error("usePublicTranslation must be used within a PublicTranslationProvider.");
  }
  return context;
}
