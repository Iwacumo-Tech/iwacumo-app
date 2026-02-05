export const GUEST_CART_KEY = "guest_cart_items";

export const notifyCartUpdate = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("cart-updated"));
  }
};