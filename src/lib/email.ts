import { Resend } from "resend";
import {
  VerifyEmailTemplate,
  PasswordResetTemplate,
  WelcomeTemplate,
  BookApprovedTemplate,
  StaffInviteTemplate,
  OrderConfirmationTemplate,
  BankAccountConnectedTemplate,
  KycApprovedTemplate,
  KycRejectedTemplate,
} from "@/emails";

if (!process.env.RESEND_API_KEY) {
  throw new Error("Missing env: RESEND_API_KEY");
}

export const resend = new Resend(process.env.RESEND_API_KEY);

const FROM    = process.env.EMAIL_FROM    ?? "iwacumo <noreply@iwacumo.com>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:8090";

// ─── Verify email ─────────────────────────────────────────────────────────────

export async function sendVerificationEmail({
  to, firstName, token,
}: { to: string; firstName: string; token: string }) {
  const verifyUrl = `${APP_URL}/api/verification/verify-email?token=${token}`;
  return resend.emails.send({
    from: FROM, to,
    subject: "Verify your email — iwacumo",
    react: VerifyEmailTemplate({ firstName, verifyUrl }),
  });
}

// ─── Password reset ───────────────────────────────────────────────────────────

export async function sendPasswordResetEmail({
  to, firstName, token,
}: { to: string; firstName: string; token: string }) {
  const resetUrl = `${APP_URL}/reset-password?token=${token}`;
  return resend.emails.send({
    from: FROM, to,
    subject: "Reset your password — iwacumo",
    react: PasswordResetTemplate({ firstName, resetUrl }),
  });
}

// ─── Welcome ──────────────────────────────────────────────────────────────────

export async function sendWelcomeEmail({
  to, firstName, role,
}: { to: string; firstName: string; role: string }) {
  return resend.emails.send({
    from: FROM, to,
    subject: "Welcome to iwacumo 🎉",
    react: WelcomeTemplate({ firstName, role }),
  });
}

// ─── Book approved ────────────────────────────────────────────────────────────

export async function sendBookApprovedEmail({
  to, firstName, bookTitle, bookId,
}: { to: string; firstName: string; bookTitle: string; bookId: string }) {
  const bookUrl = `${APP_URL}/book/${bookId}`;
  return resend.emails.send({
    from: FROM, to,
    subject: `Your book "${bookTitle}" is now live — iwacumo`,
    react: BookApprovedTemplate({ firstName, bookTitle, bookUrl }),
  });
}

export async function sendBookDeniedEmail({
  to, firstName, bookTitle, reviewerNotes,
}: { to: string; firstName: string; bookTitle: string; reviewerNotes?: string | null }) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: `Action needed for "${bookTitle}" — iwacumo`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111">
        <p>Hello ${firstName || "Author"},</p>
        <p>Your book <strong>${bookTitle}</strong> was reviewed, but it was not approved yet.</p>
        ${reviewerNotes ? `<p><strong>Reviewer note:</strong><br/>${reviewerNotes}</p>` : ""}
        <p>Please update the book and submit it again when ready.</p>
      </div>
    `,
  });
}

export async function sendBookIssueReportEmail({
  to,
  bookTitle,
  issueType,
  description,
  reporterName,
  reporterEmail,
}: {
  to: string;
  bookTitle: string;
  issueType: string;
  description: string;
  reporterName?: string | null;
  reporterEmail?: string | null;
}) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: `Book issue reported: "${bookTitle}"`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111">
        <p>A book issue report has been submitted.</p>
        <p><strong>Book:</strong> ${bookTitle}</p>
        <p><strong>Issue type:</strong> ${issueType}</p>
        <p><strong>Reporter:</strong> ${reporterName || "Anonymous"}${reporterEmail ? ` (${reporterEmail})` : ""}</p>
        <p><strong>Details:</strong><br/>${description}</p>
      </div>
    `,
  });
}

// ─── Staff invite ─────────────────────────────────────────────────────────────

export async function sendStaffInviteEmail({
  to, inviterName, role, token,
}: { to: string; inviterName: string; role: string; token: string }) {
  const setupUrl = `${APP_URL}/staff-setup?token=${token}`;
  return resend.emails.send({
    from: FROM, to,
    subject: `You've been invited to join iwacumo — ${role}`,
    react: StaffInviteTemplate({ inviterName, role, setupUrl }),
  });
}

export async function sendAuthorInviteEmail({
  to,
  inviterName,
  publisherName,
  token,
}: {
  to: string;
  inviterName: string;
  publisherName: string;
  token: string;
}) {
  const setupUrl = `${APP_URL}/api/verification/author-invite?token=${token}`;
  return resend.emails.send({
    from: FROM,
    to,
    subject: `You've been invited to author on ${publisherName} — iwacumo`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111">
        <p>Hello,</p>
        <p><strong>${inviterName}</strong> has invited you to complete your author onboarding for <strong>${publisherName}</strong> on iwacumo.</p>
        <p>Use the button below to set your password and activate your author account.</p>
        <p style="margin:24px 0;">
          <a href="${setupUrl}" style="display:inline-block;background:#111;color:#fff;padding:12px 18px;text-decoration:none;font-weight:700;">Set Up Author Account</a>
        </p>
        <p>This link expires in 7 days.</p>
      </div>
    `,
  });
}

// ─── Order confirmation ───────────────────────────────────────────────────────

interface OrderConfirmationParams {
  to:           string;
  firstName:    string;
  orderNumber:  string;
  orderDate:    Date;
  items: Array<{ title: string; type: string; quantity: number; price: number }>;
  subtotal:      number;
  shippingCost:  number;
  total:         number;
  isDigitalOnly: boolean;
  deliveryState?: string;
  shippingZone?:  string;
}

export async function sendOrderConfirmationEmail({
  to, firstName, orderNumber, orderDate, items,
  subtotal, shippingCost, total, isDigitalOnly, deliveryState, shippingZone,
}: OrderConfirmationParams) {
  const dashboardUrl = `${APP_URL}/app/orders`;
  const formatted    = orderDate.toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });
  return resend.emails.send({
    from: FROM, to,
    subject: `Order confirmed — ${orderNumber}`,
    react: OrderConfirmationTemplate({
      firstName, orderNumber, orderDate: formatted, items,
      subtotal, shippingCost, total, isDigitalOnly,
      deliveryState, shippingZone, dashboardUrl,
    }),
  });
}

// ─── Bank account connected ───────────────────────────────────────────────────

export async function sendBankAccountConnectedEmail({
  to, firstName, bankName, accountName, accountNumber,
}: {
  to:            string;
  firstName:     string;
  bankName:      string;
  accountName:   string;
  accountNumber: string; // already masked by caller
}) {
  return resend.emails.send({
    from: FROM, to,
    subject: "Payout account connected — iwacumo",
    react: BankAccountConnectedTemplate({ firstName, bankName, accountName, accountNumber }),
  });
}

// ── KYC approved ─────────────────────────────────────────────
export async function sendKycApprovedEmail({ to, firstName, orgName }: { to: string; firstName: string; orgName: string }) {
  return resend.emails.send({ from: FROM, to, subject: "🎉 KYC Approved — your publisher account is live!", react: KycApprovedTemplate({ firstName, orgName }) });
}
 
// ── KYC rejected ─────────────────────────────────────────────
export async function sendKycRejectedEmail({ to, firstName, orgName, reviewerNotes }: { to: string; firstName: string; orgName: string; reviewerNotes: string | null }) {
  return resend.emails.send({ from: FROM, to, subject: "Action required: KYC submission needs attention", react: KycRejectedTemplate({ firstName, orgName, reviewerNotes }) });
}

export async function sendAuthorKycApprovedEmail({
  to,
  firstName,
  publisherName,
}: {
  to: string;
  firstName: string;
  publisherName: string;
}) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: "Your author verification has been approved",
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111">
        <p>Hello ${firstName || "Author"},</p>
        <p>Your author verification for <strong>${publisherName}</strong> has been approved.</p>
        <p>You can now access your author tools on iwacumo.</p>
      </div>
    `,
  });
}

export async function sendAuthorKycRejectedEmail({
  to,
  firstName,
  publisherName,
  reviewerNotes,
}: {
  to: string;
  firstName: string;
  publisherName: string;
  reviewerNotes: string | null;
}) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: "Action required: author verification needs attention",
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111">
        <p>Hello ${firstName || "Author"},</p>
        <p>Your author verification for <strong>${publisherName}</strong> needs attention.</p>
        ${reviewerNotes ? `<p><strong>Reviewer note:</strong><br/>${reviewerNotes}</p>` : ""}
        <p>Please update and resubmit your documents.</p>
      </div>
    `,
  });
}
