import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { rateLimit } from '@/lib/rate-limit'

// 20 requests per minute for auth pages (login, signup, forgot-password)
const authLimiter = rateLimit({ windowMs: 60_000, max: 20 })

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Rate limit auth routes
  if (
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname === '/forgot-password'
  ) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const { allowed } = authLimiter(`auth:${ip}`)
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      )
    }
  }

  const { supabaseResponse, user } = await updateSession(request)

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
