export const PAYOUT_BLOCKING_REASONS = {
  MISSING_ACCOUNT: "missing_account",
  ACCOUNT_UNVERIFIED: "account_unverified",
  SUBACCOUNT_PENDING: "subaccount_pending",
  RECIPIENT_PENDING: "recipient_pending",
} as const;

export type PayoutBlockingReason =
  (typeof PAYOUT_BLOCKING_REASONS)[keyof typeof PAYOUT_BLOCKING_REASONS];

type PaymentAccountLike = {
  is_verified?: boolean | null;
  paystack_subaccount_code?: string | null;
  paystack_recipient_code?: string | null;
};

export type PaymentAccountReadiness = {
  has_account: boolean;
  is_verified: boolean;
  subaccount_ready: boolean;
  recipient_ready: boolean;
  payout_ready: boolean;
  blocking_reasons: PayoutBlockingReason[];
  blocking_reason_labels: string[];
};

export type OrderPayoutRoutingSnapshot = {
  publisher_white_label: boolean;
  publisher_share_payout_owner: "publisher";
  author_share_payout_owner: "author" | "publisher";
  routing_policy: "white_label_split" | "publisher_holds_author_share";
};

export type PaystackSettlementRecipient = {
  entity_type: "publisher" | "author";
  entity_id: string | null;
  display_name: string;
  subaccount_code: string;
  amount_base: number;
  amount_minor_unit: number;
};

export type PaystackDynamicSplit = {
  type: "flat";
  bearer_type: "account" | "subaccount" | "all" | "all-proportional";
  bearer_subaccount?: string;
  reference: string;
  subaccounts: Array<{
    subaccount: string;
    share: number;
  }>;
};

export type PaystackSettlementPlan = {
  mode: "subaccount" | "dynamic_split";
  currency: string;
  total_amount_base: number;
  total_amount_minor_unit: number;
  platform_amount_base: number;
  platform_amount_minor_unit: number;
  publisher_amount_base: number;
  publisher_amount_minor_unit: number;
  recipients: PaystackSettlementRecipient[];
  subaccount?: string;
  transaction_charge?: number;
  bearer?: "account" | "subaccount";
  split?: PaystackDynamicSplit;
};

type SettlementLineItem = {
  platform_fee: number;
  publisher_earnings: number;
  author_earnings: number;
  book_variant?: {
    book?: {
      author_id?: string | null;
      author?: {
        id: string;
        pen_name?: string | null;
        name?: string | null;
        user?: {
          first_name?: string | null;
          last_name?: string | null;
          payment_account?: {
            paystack_subaccount_code?: string | null;
          } | null;
        } | null;
      } | null;
    } | null;
  } | null;
};

function toMinorUnit(amount: number) {
  return Math.round(amount * 100);
}

function displayAuthorName(author: {
  pen_name?: string | null;
  name?: string | null;
  user?: { first_name?: string | null; last_name?: string | null } | null;
} | null | undefined) {
  return (
    author?.pen_name?.trim()
    || author?.name?.trim()
    || `${author?.user?.first_name ?? ""} ${author?.user?.last_name ?? ""}`.trim()
    || "Author"
  );
}

function displayPublisherName(publisherName?: string | null) {
  return publisherName?.trim() || "Publisher";
}

export function getPayoutBlockingReasonLabel(reason: PayoutBlockingReason) {
  switch (reason) {
    case PAYOUT_BLOCKING_REASONS.MISSING_ACCOUNT:
      return "No payout account has been connected yet.";
    case PAYOUT_BLOCKING_REASONS.ACCOUNT_UNVERIFIED:
      return "The saved bank account still needs verification.";
    case PAYOUT_BLOCKING_REASONS.SUBACCOUNT_PENDING:
      return "Automatic split registration is still pending.";
    case PAYOUT_BLOCKING_REASONS.RECIPIENT_PENDING:
      return "Transfer recipient registration is still pending.";
    default:
      return "Payout setup is incomplete.";
  }
}

export function buildPaymentAccountReadiness(
  account: PaymentAccountLike | null | undefined,
): PaymentAccountReadiness {
  const hasAccount = !!account;
  const isVerified = !!account?.is_verified;
  const subaccountReady = !!account?.paystack_subaccount_code;
  const recipientReady = !!account?.paystack_recipient_code;
  const blockingReasons: PayoutBlockingReason[] = [];

  if (!hasAccount) {
    blockingReasons.push(PAYOUT_BLOCKING_REASONS.MISSING_ACCOUNT);
  } else {
    if (!isVerified) {
      blockingReasons.push(PAYOUT_BLOCKING_REASONS.ACCOUNT_UNVERIFIED);
    }
    if (!subaccountReady) {
      blockingReasons.push(PAYOUT_BLOCKING_REASONS.SUBACCOUNT_PENDING);
    }
    if (!recipientReady) {
      blockingReasons.push(PAYOUT_BLOCKING_REASONS.RECIPIENT_PENDING);
    }
  }

  return {
    has_account: hasAccount,
    is_verified: isVerified,
    subaccount_ready: subaccountReady,
    recipient_ready: recipientReady,
    payout_ready: blockingReasons.length === 0,
    blocking_reasons: blockingReasons,
    blocking_reason_labels: blockingReasons.map(getPayoutBlockingReasonLabel),
  };
}

export function buildOrderPayoutRoutingSnapshot(
  publisherWhiteLabel: boolean,
): OrderPayoutRoutingSnapshot {
  return {
    publisher_white_label: publisherWhiteLabel,
    publisher_share_payout_owner: "publisher",
    author_share_payout_owner: publisherWhiteLabel ? "author" : "publisher",
    routing_policy: publisherWhiteLabel
      ? "white_label_split"
      : "publisher_holds_author_share",
  };
}

export function resolveOrderPayoutRoutingSnapshot(
  snapshot: Partial<OrderPayoutRoutingSnapshot> | null | undefined,
  fallbackPublisherWhiteLabel = false,
): OrderPayoutRoutingSnapshot {
  if (!snapshot) {
    return buildOrderPayoutRoutingSnapshot(fallbackPublisherWhiteLabel);
  }

  const publisherWhiteLabel =
    typeof snapshot.publisher_white_label === "boolean"
      ? snapshot.publisher_white_label
      : fallbackPublisherWhiteLabel;

  return {
    publisher_white_label: publisherWhiteLabel,
    publisher_share_payout_owner:
      snapshot.publisher_share_payout_owner === "publisher"
        ? "publisher"
        : "publisher",
    author_share_payout_owner:
      snapshot.author_share_payout_owner === "publisher" || snapshot.author_share_payout_owner === "author"
        ? snapshot.author_share_payout_owner
        : publisherWhiteLabel
          ? "author"
          : "publisher",
    routing_policy:
      snapshot.routing_policy === "publisher_holds_author_share" || snapshot.routing_policy === "white_label_split"
        ? snapshot.routing_policy
      : publisherWhiteLabel
          ? "white_label_split"
          : "publisher_holds_author_share",
  };
}

export function buildPaystackSettlementPlan(params: {
  orderNumber: string;
  currency: string;
  subtotalAmount: number;
  totalAmount: number;
  shippingAmount: number;
  taxAmount: number;
  discountAmount: number;
  publisher: {
    id: string | null;
    display_name: string;
    subaccount_code: string | null;
  } | null;
  payoutRouting: OrderPayoutRoutingSnapshot;
  lineItems: SettlementLineItem[];
}): PaystackSettlementPlan {
  if ((params.currency || "").toUpperCase() !== "NGN") {
    throw new Error("Paystack payout splitting is currently available only for NGN orders.");
  }

  const publisher = params.publisher;
  const publisherSubaccountCode = publisher?.subaccount_code?.trim() || null;

  if (!publisherSubaccountCode) {
    throw new Error("The publisher payout account is not fully ready for direct settlement.");
  }

  let platformAmountBase = 0;
  let publisherAmountBase = 0;
  const authorRecipients = new Map<string, PaystackSettlementRecipient>();

  for (const lineItem of params.lineItems) {
    platformAmountBase += lineItem.platform_fee || 0;
    publisherAmountBase += lineItem.publisher_earnings || 0;

    const authorEarnings = lineItem.author_earnings || 0;
    if (authorEarnings <= 0) continue;

    if (params.payoutRouting.author_share_payout_owner === "publisher") {
      publisherAmountBase += authorEarnings;
      continue;
    }

    const author = lineItem.book_variant?.book?.author ?? null;
    const authorId = lineItem.book_variant?.book?.author_id ?? author?.id ?? null;
    const authorSubaccountCode = author?.user?.payment_account?.paystack_subaccount_code?.trim() || null;

    if (!authorId || !author) {
      throw new Error("A white-label order includes author earnings without a linked author payout profile.");
    }

    if (!authorSubaccountCode) {
      throw new Error(`${displayAuthorName(author)} is missing a ready payout subaccount for direct settlement.`);
    }

    const existing = authorRecipients.get(authorId);
    if (existing) {
      existing.amount_base += authorEarnings;
      continue;
    }

    authorRecipients.set(authorId, {
      entity_type: "author",
      entity_id: authorId,
      display_name: displayAuthorName(author),
      subaccount_code: authorSubaccountCode,
      amount_base: authorEarnings,
      amount_minor_unit: 0,
    });
  }

  // Shipping is a platform-held charge. Tax and discount remain aligned to
  // the current publisher-side settlement policy without changing stored
  // line-item split math.
  platformAmountBase += params.shippingAmount || 0;
  publisherAmountBase += (params.taxAmount || 0) - (params.discountAmount || 0);

  const totalAmountMinorUnit = toMinorUnit(params.totalAmount);
  const platformAmountMinorUnit = toMinorUnit(platformAmountBase);
  let publisherAmountMinorUnit = toMinorUnit(publisherAmountBase);

  const recipients: PaystackSettlementRecipient[] = [];

  if (publisherAmountMinorUnit > 0) {
    recipients.push({
      entity_type: "publisher",
      entity_id: publisher?.id ?? null,
      display_name: displayPublisherName(publisher?.display_name),
      subaccount_code: publisherSubaccountCode,
      amount_base: publisherAmountBase,
      amount_minor_unit: publisherAmountMinorUnit,
    });
  }

  for (const recipient of authorRecipients.values()) {
    recipient.amount_minor_unit = toMinorUnit(recipient.amount_base);
    if (recipient.amount_minor_unit > 0) {
      recipients.push(recipient);
    }
  }

  const allocatedRecipientMinorUnit = recipients.reduce(
    (sum, recipient) => sum + recipient.amount_minor_unit,
    0,
  );
  const expectedRecipientMinorUnit = totalAmountMinorUnit - platformAmountMinorUnit;
  const deltaMinorUnit = expectedRecipientMinorUnit - allocatedRecipientMinorUnit;

  if (!recipients.length) {
    throw new Error("No payout recipient is available for this transaction settlement.");
  }

  if (deltaMinorUnit !== 0) {
    const publisherRecipient = recipients.find(
      (recipient) => recipient.entity_type === "publisher",
    );

    if (!publisherRecipient) {
      throw new Error("The publisher payout recipient could not be resolved for settlement adjustment.");
    }

    publisherRecipient.amount_minor_unit += deltaMinorUnit;
    publisherAmountMinorUnit += deltaMinorUnit;
  }

  if (recipients.some((recipient) => recipient.amount_minor_unit < 0)) {
    throw new Error("The computed settlement split produced an invalid negative payout share.");
  }

  const authorRecipientCount = recipients.filter(
    (recipient) => recipient.entity_type === "author",
  ).length;

  if (!authorRecipientCount) {
    return {
      mode: "subaccount",
      currency: "NGN",
      total_amount_base: params.totalAmount,
      total_amount_minor_unit: totalAmountMinorUnit,
      platform_amount_base: platformAmountBase,
      platform_amount_minor_unit: platformAmountMinorUnit,
      publisher_amount_base: publisherAmountBase,
      publisher_amount_minor_unit: recipients[0]?.amount_minor_unit ?? 0,
      recipients,
      subaccount: publisherSubaccountCode,
      transaction_charge: platformAmountMinorUnit,
      bearer: "account",
    };
  }

  return {
    mode: "dynamic_split",
    currency: "NGN",
    total_amount_base: params.totalAmount,
    total_amount_minor_unit: totalAmountMinorUnit,
    platform_amount_base: platformAmountBase,
    platform_amount_minor_unit: platformAmountMinorUnit,
    publisher_amount_base: publisherAmountBase,
    publisher_amount_minor_unit: recipients
      .find((recipient) => recipient.entity_type === "publisher")
      ?.amount_minor_unit ?? 0,
    recipients,
    split: {
      type: "flat",
      bearer_type: "account",
      reference: `split_${params.orderNumber}_${Date.now()}`,
      subaccounts: recipients.map((recipient) => ({
        subaccount: recipient.subaccount_code,
        share: recipient.amount_minor_unit,
      })),
    },
  };
}
