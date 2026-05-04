import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/utils/supabase/middleware';

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Pages that don't require authentication
  if (!path.startsWith('/admin') || path === '/admin/login') {
    return NextResponse.next();
  }

  const { supabaseResponse, user } = await updateSession(request);

  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/admin/login';
    return NextResponse.redirect(loginUrl);
  }

  // Return the supabaseResponse so refreshed session cookies are forwarded to the browser
  return supabaseResponse;
}

export const config = {
  matcher: ['/admin/(.*)'],
};
