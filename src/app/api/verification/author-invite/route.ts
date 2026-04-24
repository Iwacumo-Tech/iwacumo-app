import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:8090";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(`${APP_URL}/author-setup?error=missing_token`);
  }

  const record = await prisma.verificationToken.findUnique({
    where: { token },
  });

  if (!record || record.type !== "AUTHOR_INVITE") {
    return NextResponse.redirect(`${APP_URL}/author-setup?error=invalid`);
  }

  if (record.used_at) {
    return NextResponse.redirect(`${APP_URL}/author-setup?error=used`);
  }

  if (record.expires_at < new Date()) {
    return NextResponse.redirect(`${APP_URL}/author-setup?error=expired`);
  }

  return NextResponse.redirect(`${APP_URL}/author-setup?token=${token}`);
}
