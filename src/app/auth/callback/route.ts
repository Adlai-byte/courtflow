import { createClient } from '@/lib/supabase/server'
import { getDashboardUrl } from '@/lib/auth-redirect'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next')
  const type = searchParams.get('type')
  const errorParam = searchParams.get('error_description') || searchParams.get('error')

  // Handle OAuth errors (e.g. user denied consent, provider errors)
  if (errorParam) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(errorParam)}`
    )
  }

  if (code) {
    const supabase = await createClient()
    const { error, data } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && data?.user) {
      // Password recovery flow — redirect to reset page
      if (type === 'recovery' || next === '/reset-password') {
        return NextResponse.redirect(`${origin}/reset-password`)
      }

      // Ensure profile exists (Google OAuth may skip the trigger on first sign-in race)
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', data.user.id)
        .maybeSingle()

      if (!profile) {
        const meta = data.user.user_metadata || {}
        await supabase.from('profiles').upsert({
          id: data.user.id,
          full_name: meta.full_name || meta.name || '',
          role: meta.role || 'customer',
        }, { onConflict: 'id' })
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
