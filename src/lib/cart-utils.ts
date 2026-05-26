export const GUEST_CART_KEY = "guest_cart_items";
const GUEST_CART_BACKUP_KEY = "guest_cart_items_backup";

function getStorage(storage: "localStorage" | "sessionStorage") {
  if (typeof window === "undefined") return null;

  try {
    return window[storage];
  } catch {
    return null;
  }
}

export function getGuestCartItems<T = unknown>() {
  const primary = getStorage("localStorage");
  const backup = getStorage("sessionStorage");

  const parseItems = (raw: string | null) => {
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed as T[] : null;
    } catch {
      return null;
    }
  };

  const primaryItems = parseItems(primary?.getItem(GUEST_CART_KEY) ?? null);
  if (primaryItems) {
    backup?.setItem(GUEST_CART_BACKUP_KEY, JSON.stringify(primaryItems));
    return primaryItems;
  }

  const backupItems = parseItems(backup?.getItem(GUEST_CART_BACKUP_KEY) ?? null);
  if (backupItems) {
    primary?.setItem(GUEST_CART_KEY, JSON.stringify(backupItems));
    return backupItems;
  }

  return [] as T[];
}

export function setGuestCartItems<T = unknown>(items: T[]) {
  const serialized = JSON.stringify(items);
  getStorage("localStorage")?.setItem(GUEST_CART_KEY, serialized);
  getStorage("sessionStorage")?.setItem(GUEST_CART_BACKUP_KEY, serialized);
}

export function clearGuestCartItems() {
  getStorage("localStorage")?.removeItem(GUEST_CART_KEY);
  getStorage("sessionStorage")?.removeItem(GUEST_CART_BACKUP_KEY);
}

export const notifyCartUpdate = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("cart-updated"));
  }
};
