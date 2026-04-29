import prisma from "@/lib/prisma";
import { z } from "zod";
import { publicProcedure } from "@/server/trpc";
import { TRPCError } from "@trpc/server";
import axios from "axios";
import {
  buildPaymentAccountReadiness,
  PaymentAccountReadiness,
} from "@/lib/payout-routing";
 
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || "";
const PAYSTACK_BASE_URL   = "https://api.paystack.co";
 
const paystackHeaders = {
  Authorization:  `Bearer ${PAYSTACK_SECRET_KEY}`,
  "Content-Type": "application/json",
};
 
// ─── Schemas ──────────────────────────────────────────────────────────────────
 
export const verifyBankAccountSchema = z.object({
  bank_code:      z.string().min(1, "Bank code is required"),
  account_number: z.string().length(10, "Account number must be 10 digits"),
});
 
export const saveBankAccountSchema = z.object({
  bank_code:      z.string().min(1, "Bank code is required"),
  bank_name:      z.string().min(1, "Bank name is required"),
  account_number: z.string().length(10, "Account number must be 10 digits"),
  account_name:   z.string().min(1, "Account name is required"),
});

export const getBookCreationPayoutStatusSchema = z.object({
  author_id: z.string().optional(),
  publisher_id: z.string().optional(),
});

type GateEntityStatus = PaymentAccountReadiness & {
  entity_type: "publisher" | "author";
  entity_id: string;
  display_name: string;
  white_label: boolean | null;
};

function buildPublisherDisplayName(publisher: {
  tenant?: { name?: string | null } | null;
  user?: { first_name?: string | null; last_name?: string | null } | null;
}) {
  return (
    publisher.tenant?.name?.trim()
    || `${publisher.user?.first_name ?? ""} ${publisher.user?.last_name ?? ""}`.trim()
    || "Publisher"
  );
}

function buildAuthorDisplayName(author: {
  pen_name?: string | null;
  name?: string | null;
  user?: { first_name?: string | null; last_name?: string | null } | null;
}) {
  return (
    author.pen_name?.trim()
    || author.name?.trim()
    || `${author.user?.first_name ?? ""} ${author.user?.last_name ?? ""}`.trim()
    || "Author"
  );
}

function buildGateEntityStatus(params: {
  entity_type: "publisher" | "author";
  entity_id: string;
  display_name: string;
  white_label: boolean | null;
  account: {
    is_verified?: boolean | null;
    paystack_subaccount_code?: string | null;
    paystack_recipient_code?: string | null;
  } | null | undefined;
}): GateEntityStatus {
  const readiness = buildPaymentAccountReadiness(params.account);

  return {
    entity_type: params.entity_type,
    entity_id: params.entity_id,
    display_name: params.display_name,
    white_label: params.white_label,
    ...readiness,
  };
}

export async function resolveBookCreationPayoutStatus(params: {
  sessionUserId: string;
  activeProfile?: string | null;
  authorId?: string | null;
  publisherId?: string | null;
}) {
  const creator = await prisma.user.findUnique({
    where: { id: params.sessionUserId },
    include: {
      payment_account: true,
      publisher: {
        select: {
          id: true,
        },
      },
      author: {
        include: {
          publisher: {
            select: {
              id: true,
              white_label: true,
            },
          },
        },
      },
    },
  });

  if (!creator) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "We could not find your payout setup context. Please refresh and try again.",
    });
  }

  const selectedAuthor =
    params.authorId
      ? await prisma.author.findUnique({
          where: { id: params.authorId },
          include: {
            user: {
              include: {
                payment_account: true,
              },
            },
            publisher: {
              include: {
                tenant: {
                  select: {
                    name: true,
                  },
                },
                user: {
                  select: {
                    first_name: true,
                    last_name: true,
                    payment_account: true,
                  },
                },
              },
            },
          },
        })
      : null;

  const resolvedPublisherId =
    params.publisherId
    || creator.publisher?.id
    || creator.author?.publisher?.id
    || selectedAuthor?.publisher?.id
    || null;

  const resolvedPublisher =
    resolvedPublisherId
      ? await prisma.publisher.findUnique({
          where: { id: resolvedPublisherId },
          include: {
            tenant: {
              select: {
                name: true,
              },
            },
            user: {
              select: {
                first_name: true,
                last_name: true,
                payment_account: true,
              },
            },
          },
        })
      : null;

  const normalizedProfile = params.activeProfile ?? null;
  const publisherStatus = resolvedPublisher
    ? buildGateEntityStatus({
        entity_type: "publisher",
        entity_id: resolvedPublisher.id,
        display_name: buildPublisherDisplayName(resolvedPublisher),
        white_label: resolvedPublisher.white_label,
        account: resolvedPublisher.user?.payment_account,
      })
    : null;

  const actingAuthorStatus = creator.author
    ? buildGateEntityStatus({
        entity_type: "author",
        entity_id: creator.author.id,
        display_name: buildAuthorDisplayName({
          pen_name: creator.author.pen_name,
          name: creator.author.name,
          user: creator,
        }),
        white_label: creator.author.publisher?.white_label ?? null,
        account: creator.payment_account,
      })
    : null;

  const selectedAuthorStatus = selectedAuthor
    ? buildGateEntityStatus({
        entity_type: "author",
        entity_id: selectedAuthor.id,
        display_name: buildAuthorDisplayName(selectedAuthor),
        white_label: selectedAuthor.publisher?.white_label ?? null,
        account: selectedAuthor.user?.payment_account,
      })
    : null;

  const isAuthorProfile = normalizedProfile === "author";
  const isPublisherProfile = normalizedProfile === "publisher";

  let canOpenAddBook = true;
  let canSubmitWithSelectedAuthor = true;
  const openBlockingEntities: GateEntityStatus[] = [];
  const submitBlockingEntities: GateEntityStatus[] = [];

  if (isAuthorProfile && actingAuthorStatus?.white_label) {
    if (publisherStatus && !publisherStatus.payout_ready) {
      openBlockingEntities.push(publisherStatus);
      submitBlockingEntities.push(publisherStatus);
    }
    if (!actingAuthorStatus.payout_ready) {
      openBlockingEntities.push(actingAuthorStatus);
      submitBlockingEntities.push(actingAuthorStatus);
    }
  }

  if (isPublisherProfile && publisherStatus && !publisherStatus.payout_ready) {
    openBlockingEntities.push(publisherStatus);
    submitBlockingEntities.push(publisherStatus);
  }

  if (
    isPublisherProfile
    && selectedAuthorStatus
    && selectedAuthorStatus.white_label
    && !selectedAuthorStatus.payout_ready
  ) {
    submitBlockingEntities.push(selectedAuthorStatus);
  }

  canOpenAddBook = openBlockingEntities.length === 0;
  canSubmitWithSelectedAuthor = submitBlockingEntities.length === 0;

  return {
    active_profile: normalizedProfile,
    can_open_add_book: canOpenAddBook,
    can_submit_with_selected_author: canSubmitWithSelectedAuthor,
    publisher: publisherStatus,
    acting_author: actingAuthorStatus,
    selected_author: selectedAuthorStatus,
    blocking_entities_for_open: openBlockingEntities,
    blocking_entities_for_submit: submitBlockingEntities,
  };
}
 
// ─── listBanks ────────────────────────────────────────────────────────────────
// Fetches the full Paystack bank list for Nigeria.
// Cached in the DB as SystemSettings["paystack_banks"] for 24 hours
// to avoid hammering the Paystack API on every page load.
 
export const listBanks = publicProcedure.query(async () => {
  // Try cache first
  const cached = await prisma.systemSettings.findUnique({
    where: { key: "paystack_banks" },
  });
 
  if (cached) {
    const { banks, cached_at } = cached.value as { banks: any[]; cached_at: string };
    const ageMs = Date.now() - new Date(cached_at).getTime();
    const ttlMs = 24 * 60 * 60 * 1000; // 24 hours
    if (ageMs < ttlMs) return banks;
  }
 
  // Fetch from Paystack
  try {
    const response = await axios.get(
      `${PAYSTACK_BASE_URL}/bank?country=nigeria&per_page=100&use_cursor=false`,
      { headers: paystackHeaders }
    );
 
    const banks: Array<{ id: number; name: string; code: string }> =
      response.data.data.map((b: any) => ({
        id:   b.id,
        name: b.name,
        code: b.code,
      }));
 
    // Upsert cache
    await prisma.systemSettings.upsert({
      where:  { key: "paystack_banks" },
      create: { key: "paystack_banks", value: { banks, cached_at: new Date().toISOString() } },
      update: { value: { banks, cached_at: new Date().toISOString() } },
    });
 
    return banks;
  } catch (error: any) {
    console.error("[listBanks] Paystack error:", error.response?.data || error.message);
    throw new TRPCError({
      code:    "INTERNAL_SERVER_ERROR",
      message: "Could not fetch bank list. Please try again.",
    });
  }
});
 
// ─── verifyBankAccount ────────────────────────────────────────────────────────
// Calls Paystack /bank/resolve to confirm the account number and return
// the account holder's name for the user to confirm before saving.
 
export const verifyBankAccount = publicProcedure
  .input(verifyBankAccountSchema)
  .mutation(async ({ ctx, input }) => {
    if (!ctx.session?.user?.id) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated." });
    }
 
    try {
      const response = await axios.get(
        `${PAYSTACK_BASE_URL}/bank/resolve?account_number=${input.account_number}&bank_code=${input.bank_code}`,
        { headers: paystackHeaders }
      );
 
      const { account_name, account_number } = response.data.data;
 
      return {
        account_name,
        account_number,
        verified: true,
      };
    } catch (error: any) {
      const msg = error.response?.data?.message || "Could not verify account.";
      // Paystack returns 422 for unresolvable accounts
      throw new TRPCError({
        code:    "BAD_REQUEST",
        message: msg,
      });
    }
  });
 
// ─── saveBankAccount ──────────────────────────────────────────────────────────
// Saves verified bank details, then:
//   1. Creates a Paystack subaccount (used for inline split on initializePayment)
//   2. Creates a Paystack transfer recipient (used for manual Transfer API payouts)
// Both codes are stored on the PaymentAccount record.
 
export const saveBankAccount = publicProcedure
  .input(saveBankAccountSchema)
  .mutation(async ({ ctx, input }) => {
    if (!ctx.session?.user?.id) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated." });
    }
    const userId = ctx.session.user.id;
 
    // Fetch user details for Paystack registration
    const user = await prisma.user.findUnique({
      where:   { id: userId },
      select:  { first_name: true, last_name: true, email: true },
    });
    if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });
 
    const businessName = `${user.first_name} ${user.last_name || ""}`.trim();
    const email        = user.email;
 
    // ── 1. Create Paystack subaccount ─────────────────────────────────────
    // Subaccounts are used for automatic split at transaction initialization.
    // percentage_charge is set to 0 here — the platform split is applied
    // dynamically when we build the split object in initializePayment.
    let paystackSubaccountCode: string | null = null;
    let paystackRecipientCode:  string | null = null;
 
    try {
      const subRes = await axios.post(
        `${PAYSTACK_BASE_URL}/subaccount`,
        {
          business_name:      businessName,
          settlement_bank:    input.bank_code,
          account_number:     input.account_number,
          percentage_charge:  0,  // platform controls actual split via split object
          primary_contact_email: email,
          primary_contact_name:  businessName,
        },
        { headers: paystackHeaders }
      );
      paystackSubaccountCode = subRes.data.data.subaccount_code;
    } catch (error: any) {
      // Non-fatal: store account without subaccount code, can retry later
      console.error("[saveBankAccount] Subaccount creation failed:", error.response?.data || error.message);
    }
 
    // ── 2. Create Paystack transfer recipient ─────────────────────────────
    // Recipients are used for the Paystack Transfer API (manual payouts).
    try {
      const recRes = await axios.post(
        `${PAYSTACK_BASE_URL}/transferrecipient`,
        {
          type:           "nuban",
          name:           businessName,
          account_number: input.account_number,
          bank_code:      input.bank_code,
          currency:       "NGN",
        },
        { headers: paystackHeaders }
      );
      paystackRecipientCode = recRes.data.data.recipient_code;
    } catch (error: any) {
      console.error("[saveBankAccount] Recipient creation failed:", error.response?.data || error.message);
    }
 
    // ── 3. Upsert PaymentAccount record ───────────────────────────────────
    const account = await prisma.paymentAccount.upsert({
      where:  { user_id: userId },
      create: {
        user_id:                  userId,
        bank_name:                input.bank_name,
        bank_code:                input.bank_code,
        account_number:           input.account_number,
        account_name:             input.account_name,
        paystack_subaccount_code: paystackSubaccountCode,
        paystack_recipient_code:  paystackRecipientCode,
        is_verified:              true,
      },
      update: {
        bank_name:                input.bank_name,
        bank_code:                input.bank_code,
        account_number:           input.account_number,
        account_name:             input.account_name,
        paystack_subaccount_code: paystackSubaccountCode ?? undefined,
        paystack_recipient_code:  paystackRecipientCode  ?? undefined,
        is_verified:              true,
      },
    });
 
    // ── 4. Send confirmation email (non-blocking) ─────────────────────────
    void (async () => {
      try {
        const { sendBankAccountConnectedEmail } = await import("@/lib/email");
        await sendBankAccountConnectedEmail({
          to:          email,
          firstName:   user.first_name,
          bankName:    input.bank_name,
          accountName: input.account_name,
          accountNumber: `****${input.account_number.slice(-4)}`,
        });
      } catch (mailErr) {
        console.error("[saveBankAccount] Email notification failed:", mailErr);
      }
    })();
 
    return {
      success:                  true,
      account_name:             account.account_name,
      bank_name:                account.bank_name,
      account_number_masked:    `****${account.account_number.slice(-4)}`,
      subaccount_ready:         !!account.paystack_subaccount_code,
      recipient_ready:          !!account.paystack_recipient_code,
    };
  });
 
// ─── getMyPaymentAccount ──────────────────────────────────────────────────────
// Returns the current user's saved payment account (masked).
 
export const getMyPaymentAccount = publicProcedure.query(async ({ ctx }) => {
  if (!ctx.session?.user?.id) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated." });
  }
 
  const account = await prisma.paymentAccount.findUnique({
    where:  { user_id: ctx.session.user.id },
    select: {
      id:                       true,
      bank_name:                true,
      bank_code:                true,
      account_name:             true,
      // Mask the account number — never expose full number to client
      account_number:           true,
      is_verified:              true,
      paystack_subaccount_code: true,
      paystack_recipient_code:  true,
      created_at:               true,
      updated_at:               true,
    },
  });

  if (!account) return null;

  const readiness = buildPaymentAccountReadiness(account);
 
  return {
    ...account,
    account_number_masked: `****${account.account_number.slice(-4)}`,
    // Expose only whether codes exist, not the codes themselves
    subaccount_ready: readiness.subaccount_ready,
    recipient_ready:  readiness.recipient_ready,
    payout_ready: readiness.payout_ready,
    blocking_reasons: readiness.blocking_reasons,
    blocking_reason_labels: readiness.blocking_reason_labels,
    // Strip the actual codes from the response
    paystack_subaccount_code: undefined,
    paystack_recipient_code:  undefined,
  };
});

export const getBookCreationPayoutStatus = publicProcedure
  .input(getBookCreationPayoutStatusSchema)
  .query(async ({ ctx, input }) => {
    if (!ctx.session?.user?.id) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated." });
    }

    return resolveBookCreationPayoutStatus({
      sessionUserId: ctx.session.user.id,
      activeProfile: ctx.session.activeProfile ?? null,
      authorId: input.author_id ?? null,
      publisherId: input.publisher_id ?? null,
    });
  });
