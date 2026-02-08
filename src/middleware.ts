import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

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

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path.endsWith('.map') && MISSING_MAP_PATTERN.test(path)) {
    return new NextResponse(EMPTY_SOURCE_MAP, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=0',
      },
    });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/_next/static/chunks/:path*'],
};
