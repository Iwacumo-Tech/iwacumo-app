import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  validateVerificationToken,
  consumeVerificationToken,
} from "@/lib/tokens";
import { sendWelcomeEmail } from "@/lib/email";
 
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:8090";
 
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
 
  // ── 1. Token param must be present ──────────────────────────
  if (!token) {
    return NextResponse.redirect(
      `${APP_URL}/verify-email?error=missing_token`
    );
  }
 
  try {
    // ── 2. Validate token ──────────────────────────────────────
    const userId = await validateVerificationToken(token, "EMAIL_VERIFY");
 
    // ── 3. Mark user as verified ───────────────────────────────
    const user = await prisma.user.update({
      where: { id: userId },
      data: { email_verified_at: new Date() },
    });
 
    // ── 4. Consume (single-use) ────────────────────────────────
    await consumeVerificationToken(token);
 
    // ── 5. Determine their role for the welcome email ──────────
    const claim = await prisma.claim.findFirst({
      where: { user_id: userId, type: "ROLE", active: true },
    });
    const role = claim?.role_name ?? "customer";
 
    // ── 6. Fire welcome email (non-blocking — don't await) ─────
    sendWelcomeEmail({
      to: user.email,
      firstName: user.first_name,
      role,
    }).catch((err) =>
      console.error("[email] Failed to send welcome email:", err)
    );
 
    // ── 7. Redirect to login with success flag ─────────────────
    return NextResponse.redirect(
      `${APP_URL}/login?verified=true`
    );
  } catch (err: any) {
    const reason =
      err.message === "TOKEN_EXPIRED"
        ? "expired"
        : err.message === "TOKEN_USED"
        ? "used"
        : "invalid";
 
    return NextResponse.redirect(
      `${APP_URL}/verify-email?error=${reason}`
    );
  }
}