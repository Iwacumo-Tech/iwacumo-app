
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
 
export async function GET(req: NextRequest) {
  // Basic internal guard — not a security boundary, just prevents
  // accidental public exposure. The data returned is non-sensitive.
  const isInternal = req.headers.get("x-internal") === "1";
  if (!isInternal) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
 
  const publisherId = req.nextUrl.searchParams.get("publisher_id");
  if (!publisherId) {
    return NextResponse.json({ status: "pending" });
  }
 
  const kyc = await prisma.kycVerification.findUnique({
    where:  { publisher_id: publisherId },
    select: { status: true },
  });
 
  return NextResponse.json({ status: kyc?.status ?? "pending" });

}