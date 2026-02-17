import Link from 'next/link'
import { getTenantBySlug } from '@/lib/tenant'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

export default async function BookingLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const tenant = await getTenantBySlug(slug)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let initials = 'U'
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()
    if (profile?.full_name) {
      initials = profile.full_name
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link href={`/${slug}`} className="font-mono text-sm font-medium tracking-tight">
            {tenant.name}
          </Link>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <Link href={`/${slug}/my-bookings`}>
                  <Button variant="ghost" size="sm" className="font-mono text-xs uppercase tracking-wider">
                    My Bookings
                  </Button>
                </Link>
                <Avatar className="h-8 w-8 border border-border">
                  <AvatarFallback className="bg-primary/10 font-mono text-xs text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </>
            ) : (
              <Link href={`/login?redirect=/${slug}`}>
                <Button size="sm" className="font-mono text-xs uppercase tracking-wider">
                  Sign in
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        {children}
      </main>
    </div>
  )
}
