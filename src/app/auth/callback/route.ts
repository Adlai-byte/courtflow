import { createClient } from '@/lib/supabase/server'
import { getDashboardUrl } from '@/lib/auth-redirect'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next')
  const type = searchParams.get('type')

  if (code) {
    const supabase = await createClient()
    const { error, data } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Password recovery flow — redirect to reset page
      if (type === 'recovery' || next === '/reset-password') {
        return NextResponse.redirect(`${origin}/reset-password`)
      }
      // If an explicit redirect was provided, use it
      if (next) {
        return NextResponse.redirect(`${origin}${next}`)
      }
      // Otherwise resolve based on user role
      const dashboardUrl = await getDashboardUrl(supabase, data.user.id)
      return NextResponse.redirect(`${origin}${dashboardUrl}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=Could+not+authenticate`)
}
