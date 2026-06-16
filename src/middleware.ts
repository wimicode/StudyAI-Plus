import { type NextRequest, NextResponse } from 'next/server';

// Middleware minimal — aucune API Node.js, compatible Edge Runtime
// La protection des routes est gérée côté client par les composants auth
export function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js|workbox-.*.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
