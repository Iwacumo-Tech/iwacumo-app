import { NextResponse } from "next/server";
 
export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set("kyc_status", "", {
    path:    "/",
    maxAge:  0, // immediate expiry = delete
    httpOnly: true,
    sameSite: "lax",
  });
  return response;
}
 