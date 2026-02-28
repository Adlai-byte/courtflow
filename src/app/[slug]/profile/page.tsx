import { redirect } from 'next/navigation'
import { getTenantBySlug } from '@/lib/tenant'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateProfile } from './actions'
import { ProfileAvatarSection } from '@/components/profile/profile-avatar-section'

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  await getTenantBySlug(slug)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?redirect=/${slug}/profile`)
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  async function handleUpdate(formData: FormData) {
    'use server'
    await updateProfile(slug, formData)
  }

  return (
    <div className="space-y-6">
      <span className="section-label block">[ PROFILE ]</span>
      <h1 className="text-2xl font-bold tracking-tight">Profile</h1>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Your Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <ProfileAvatarSection
            userId={user.id}
            slug={slug}
            currentAvatarUrl={profile?.avatar_url || null}
            fullName={profile?.full_name || null}
          />
          <div className="mb-4 rounded-lg bg-muted/50 px-4 py-3">
            <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Email</p>
            <p className="mt-1 text-sm">{user.email}</p>
          </div>
          <form action={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input id="full_name" name="full_name" defaultValue={profile?.full_name || ''} placeholder="John Doe" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" type="tel" defaultValue={profile?.phone || ''} placeholder="+1 (555) 000-0000" />
            </div>
            <Button type="submit">
              <span className="font-mono text-xs uppercase tracking-wider">Save Changes</span>
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
