import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

/**
 * Avoid 404s for known-missing source maps (Next internal chunks that don't emit .map).
 * Only handles the specific path that 404s so real source maps are unchanged.
 */
const EMPTY_SOURCE_MAP = JSON.stringify({
  version: 3,
  sources: [],
  names: [],
  mappings: '',
});

const MISSING_MAP_PATTERN = /LayoutGroupContext\.mjs\.map$/;

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // Handle source map requests
  if (path.endsWith('.map') && MISSING_MAP_PATTERN.test(path)) {
    return new NextResponse(EMPTY_SOURCE_MAP, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=0',
      },
    });
  }

  // Refresh Supabase session for all requests
  // This ensures the session is always up to date and automatically refreshes tokens
  const { response } = await updateSession(request);
  
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    // Run for known-missing source map so we can return 200 with empty map (avoids 404)
    '/(.*)LayoutGroupContext.mjs.map',
  ],
};
