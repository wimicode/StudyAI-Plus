import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

// Force this middleware to run on the Node.js runtime instead of the Edge runtime
// so that Supabase SSR (which uses Node APIs like process.version) is supported.
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico|js|css)$).*)',
  ],
  runtime: 'nodejs',
};
