"use client";

import { useEffect } from "react";

const STORAGE_KEY = "iwacumo-public-language";
const PENDING_KEY = "iwacumo-public-language-pending";
const COOKIE_NAME = "googtrans";

export function DisableTranslation() {
  useEffect(() => {
    document.cookie = `${COOKIE_NAME}=/en/en;path=/;max-age=31536000`;
    window.localStorage.setItem(STORAGE_KEY, "en");
    window.localStorage.removeItem(PENDING_KEY);
  }, []);

  return null;
}

