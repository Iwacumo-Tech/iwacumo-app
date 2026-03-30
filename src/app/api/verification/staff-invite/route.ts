// Called when the invited staff member clicks their email link.
// Validates the token is real and not expired, then redirects to
// the setup page. The setup page calls setupStaffAccount tRPC
// mutation to actually activate the account.
//
// We intentionally do NOT consume the token here — it's consumed
// by setupStaffAccount after the form is submitted. This lets
// the staff member refresh the setup page without losing access.


import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
 
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:8090";
 
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
 
  if (!token) {
    return NextResponse.redirect(`${APP_URL}/staff-setup?error=missing_token`);
  }
 
  // Validate token exists and is not expired / used
  const record = await prisma.verificationToken.findUnique({
    where: { token },
  });
 
  if (!record || record.type !== "STAFF_INVITE") {
    return NextResponse.redirect(`${APP_URL}/staff-setup?error=invalid`);
  }
 
  if (record.used_at) {
    return NextResponse.redirect(`${APP_URL}/staff-setup?error=used`);
  }
 
  if (record.expires_at < new Date()) {
    return NextResponse.redirect(`${APP_URL}/staff-setup?error=expired`);
  }
 
  // Token is valid — send to setup page with token in URL
  // The setup form will call trpc.setupStaffAccount with this token
  return NextResponse.redirect(
    `${APP_URL}/staff-setup?token=${token}`
  );
}