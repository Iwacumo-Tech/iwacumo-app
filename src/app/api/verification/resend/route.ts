import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { wasTokenRecentlySent, createVerificationToken } from "@/lib/tokens";
import { sendVerificationEmail } from "@/lib/email";
 
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
 
    if (!email || typeof email !== "string") {
      return NextResponse.json({ ok: true });
    }
 
    const user = await prisma.user.findUnique({ where: { email } });
 
    // If user not found OR already verified — still return ok (no enumeration)
    if (!user || user.email_verified_at) {
      return NextResponse.json({ ok: true });
    }
 
    // Rate limit: 60-second cooldown
    const tooSoon = await wasTokenRecentlySent(user.id, "EMAIL_VERIFY", 60);
    if (tooSoon) {
      return NextResponse.json(
        { ok: false, error: "RATE_LIMITED" },
        { status: 429 }
      );
    }
 
    const token = await createVerificationToken(user.id, "EMAIL_VERIFY");
 
    await sendVerificationEmail({
      to: user.email,
      firstName: user.first_name,
      token,
    });
 
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[resend-verification]", err);
    return NextResponse.json({ ok: true });
  }
}
 