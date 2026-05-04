import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/utils/supabase/middleware';

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Pages that don't require authentication — let through without session refresh
  if (!path.startsWith('/admin') || path === '/admin/login') {
    return NextResponse.next();
  }

  // For all /admin/* routes: refresh session cookies AND verify auth
  const { supabaseResponse, user } = await updateSession(request);

  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/admin/login';
    return NextResponse.redirect(loginUrl);
  }

  // Return supabaseResponse — critical: carries the refreshed session cookies to the browser
  return supabaseResponse;
}

export const config = {
  matcher: ['/admin/(.*)'],
};
