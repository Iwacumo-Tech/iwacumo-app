import { OrderPayoutRoutingSnapshot } from "@/lib/payout-routing";

export type OrderCheckoutQuote = {
  base_currency: string;
  checkout_currency: string;
  fx_rate_to_base: number;
  base_subtotal_amount: number;
  base_shipping_amount: number;
  base_total_amount: number;
  checkout_subtotal_amount: number;
  checkout_shipping_amount: number;
  checkout_total_amount: number;
  payment_gateway: string | null;
  payment_method: string | null;
};

export type OrderNotesData = {
  delivery_address?: Record<string, any> | null;
  delivery_required?: boolean;
  requires_physical_delivery?: boolean;
  shipping_provider?: string | null;
  shipping_zone?: string | null;
  shipping_group?: string | null;
  total_weight_grams?: number | null;
  checkout_quote?: OrderCheckoutQuote | null;
  payout_routing?: OrderPayoutRoutingSnapshot | null;
  notes_text?: string | null;
  cancellation_reason?: string | null;
};

export function parseOrderNotes(notes: string | null | undefined): OrderNotesData | null {
  if (!notes) return null;

  try {
    const parsed = JSON.parse(notes);
    return parsed && typeof parsed === "object" ? parsed as OrderNotesData : null;
  } catch {
    return null;
  }
}

export function mergeOrderNotes(
  existingNotes: string | null | undefined,
  updates: Partial<OrderNotesData>,
) {
  const parsed = parseOrderNotes(existingNotes);
  const merged: OrderNotesData = {
    ...(parsed ?? {}),
    ...updates,
  };

  if (!parsed && existingNotes && !updates.notes_text) {
    merged.notes_text = existingNotes;
  }

  return JSON.stringify(merged);
}

export function appendCancellationReason(
  existingNotes: string | null | undefined,
  reason: string,
) {
  const parsed = parseOrderNotes(existingNotes);

  if (parsed) {
    return JSON.stringify({
      ...parsed,
      cancellation_reason: reason,
    });
  }

  return `${existingNotes || ""}\n[Cancelled]: ${reason}`.trim();
}
