import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createBusiness } from './actions'

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // If user already has a tenant, redirect to dashboard
  const { data: tenant } = await supabase
    .from('tenants')
    .select('slug')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (tenant) {
    redirect(`/dashboard/${tenant.slug}`)
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">Set up your business</CardTitle>
        <CardDescription>Tell us about your court facility</CardDescription>
      </CardHeader>
      <CardContent>
        {params.error && (
          <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {params.error}
          </div>
        )}
        <form action={createBusiness} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Business Name</Label>
            <Input id="name" name="name" required placeholder="Joe's Courts" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Your URL</Label>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <span>courtflow.com/</span>
              <Input
                id="slug"
                name="slug"
                required
                placeholder="joes-courts"
                pattern="[a-z0-9-]+"
                className="flex-1"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Premium indoor courts for basketball and pickleball..."
              rows={3}
            />
          </div>
          <Button type="submit" className="w-full">Create Business</Button>
        </form>
      </CardContent>
    </Card>
  )
}
