import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request)
  const { pathname } = request.nextUrl

  // Helper: redirect to login with return URL
  function redirectToLogin() {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  // Admin routes: require auth + platform_admin role
  if (pathname.startsWith('/admin')) {
    if (!user) return redirectToLogin()
    const role = user.user_metadata?.role
    if (role !== 'platform_admin') {
      const url = request.nextUrl.clone()
      url.pathname = '/explore'
      return NextResponse.redirect(url)
    }
  }

  // Dashboard routes: require auth + business_owner role
  if (pathname.startsWith('/dashboard')) {
    if (!user) return redirectToLogin()
    const role = user.user_metadata?.role
    if (role !== 'business_owner' && role !== 'platform_admin') {
      const url = request.nextUrl.clone()
      url.pathname = '/explore'
      return NextResponse.redirect(url)
    }
  }

  // Customer account pages: require auth
  if (
    pathname.includes('/my-bookings') ||
    pathname.includes('/my-membership') ||
    pathname.includes('/my-waitlist') ||
    pathname.includes('/profile')
  ) {
    if (!user) return redirectToLogin()
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
