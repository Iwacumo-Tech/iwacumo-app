import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 1. Define routes that should NEVER be treated as a publisher slug
const RESERVED_SLUGS = [
  'api', 'trpc', 'app', 'dashboard', 'login', 'register', 
  'shop', 'cart', 'checkout', 'settings', 'admin', 'auth'
];

export function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const path = url.pathname;
  const pathParts = path.split('/').filter(Boolean);
  const firstPart = pathParts[0];

  // 2. Skip Next.js internals, static files, and APIs
  if (
    path.startsWith('/_next') || 
    path.startsWith('/static') || 
    path.startsWith('/api') || 
    path.startsWith('/trpc') ||
    path.includes('.') // Matches files like favicon.ico or images
  ) {
    return NextResponse.next();
  }

  // 3. Check if the first part of the path is a reserved system route
  if (RESERVED_SLUGS.includes(firstPart)) {
    return NextResponse.next();
  }

  // 4. THE REWRITE LOGIC
  // If we have booka.africa/prymshare (pathParts.length === 1)
  if (pathParts.length === 1 && firstPart) {
    // Internally map to /store/[slug]
    // The user still sees booka.africa/prymshare in the bar
    return NextResponse.rewrite(new URL(`/store/${firstPart}`, request.url));
  }

  // 5. Handle sub-paths (e.g., booka.africa/prymshare/books/123)
  if (pathParts.length > 1 && !RESERVED_SLUGS.includes(firstPart)) {
     const remainingPath = pathParts.slice(1).join('/');
     return NextResponse.rewrite(new URL(`/store/${firstPart}/${remainingPath}`, request.url));
  }

  return NextResponse.next();
}