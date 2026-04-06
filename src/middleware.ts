import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
 
// These path prefixes are never publisher slugs
const RESERVED_PREFIXES = [
  "api", "trpc", "app", "login", "register", "shop", "cart",
  "checkout", "settings", "admin", "auth", "store", "book",
  "author", "sign-up", "verify-email", "forgot-password",
  "reset-password", "staff-setup", "_next", "static",
];
 
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
 
  // Skip static files and anything with a file extension
  if (pathname.includes(".")) {
    return NextResponse.next();
  }
 
  const pathParts = pathname.split("/").filter(Boolean);
  const firstPart = pathParts[0];
 
  // No first segment, or it's a reserved system path — pass through
  if (!firstPart || RESERVED_PREFIXES.includes(firstPart)) {
    return NextResponse.next();
  }
 
  // Single segment: /prymshare → /store/prymshare
  if (pathParts.length === 1) {
    return NextResponse.rewrite(
      new URL(`/store/${firstPart}`, request.url)
    );
  }
 
  // Multi-segment: /prymshare/books/123 → /store/prymshare/books/123
  const remainingPath = pathParts.slice(1).join("/");
  return NextResponse.rewrite(
    new URL(`/store/${firstPart}/${remainingPath}`, request.url)
  );
}
 
export const config = {
  // Only run on paths that could be publisher slugs.
  // Explicitly skip Next.js internals.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};