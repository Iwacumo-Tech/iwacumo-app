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
