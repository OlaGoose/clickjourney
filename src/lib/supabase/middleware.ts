/**
 * Supabase client for middleware.
 * Handles session refresh and cookie persistence so login is kept (e.g. 30 days)
 * until the user explicitly signs out.
 *
 * Best practice: call getSession() only. It reads from cookies and triggers
 * token refresh when needed; the refreshed session is written back via setAll.
 * Do NOT call getUser() before getSession() — validating an expired JWT can
 * cause unexpected logouts before refresh runs.
 */

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@/types/database';

export async function updateSession(request: NextRequest) {
  const response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Refresh session if needed (uses refresh token; updates cookies).
  // Session persists per Supabase project settings (e.g. 30 days) until sign out.
  await supabase.auth.getSession();

  return { response };
}
