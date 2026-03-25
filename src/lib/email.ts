import { Resend } from "resend";
import {
  VerifyEmailTemplate,
  PasswordResetTemplate,
  WelcomeTemplate,
  BookApprovedTemplate,
} from "@/emails";

if (!process.env.RESEND_API_KEY) {
  throw new Error("Missing env: RESEND_API_KEY");
}

export const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = process.env.EMAIL_FROM ?? "iwacumo <noreply@iwacumo.com>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:8090";

// ─── Send: email verification ─────────────────────────────────
export async function sendVerificationEmail({
  to,
  firstName,
  token,
}: {
  to: string;
  firstName: string;
  token: string;
}) {
  const verifyUrl = `${APP_URL}/api/verification/verify-email?token=${token}`;
  return resend.emails.send({
    from: FROM,
    to,
    subject: "Verify your email — iwacumo",
    react: VerifyEmailTemplate({ firstName, verifyUrl }),
  });
}

// ─── Send: password reset ──────────────────────────────────────
export async function sendPasswordResetEmail({
  to,
  firstName,
  token,
}: {
  to: string;
  firstName: string;
  token: string;
}) {
  const resetUrl = `${APP_URL}/reset-password?token=${token}`;
  return resend.emails.send({
    from: FROM,
    to,
    subject: "Reset your password — iwacumo",
    react: PasswordResetTemplate({ firstName, resetUrl }),
  });
}

// ─── Send: welcome (after verified) ───────────────────────────
export async function sendWelcomeEmail({
  to,
  firstName,
  role,
}: {
  to: string;
  firstName: string;
  role: string;
}) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: "Welcome to iwacumo 🎉",
    react: WelcomeTemplate({ firstName, role }),
  });
}

// ─── Send: book approved ───────────────────────────────────────
export async function sendBookApprovedEmail({
  to,
  firstName,
  bookTitle,
  bookId,
}: {
  to: string;
  firstName: string;
  bookTitle: string;
  bookId: string;
}) {
  // Public-facing book URL — adjust the path to match your shop route
  const bookUrl = `${APP_URL}/book/${bookId}`;
  return resend.emails.send({
    from: FROM,
    to,
    subject: `Your book "${bookTitle}" is now live — iwacumo`,
    react: BookApprovedTemplate({ firstName, bookTitle, bookUrl }),
  });
}