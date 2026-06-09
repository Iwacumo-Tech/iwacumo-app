import { formatMoney } from "@/lib/payment-config";

export function formatPublicNairaPrice(amount?: number | null) {
  const normalizedAmount = amount ?? 0;
  if (normalizedAmount <= 0) return "Free";
  return `₦${normalizedAmount.toLocaleString()}`;
}

export function formatPublicCurrencyPrice(amount: number | null | undefined, currency: string) {
  const normalizedAmount = amount ?? 0;
  if (normalizedAmount <= 0) return "Free";
  return formatMoney(normalizedAmount, currency);
}
