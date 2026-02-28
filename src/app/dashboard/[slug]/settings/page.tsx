import { redirect } from 'next/navigation'
import { requireTenantOwner } from '@/lib/tenant'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { updateTenant } from './actions'

export default async function SettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ success?: string; error?: string }>
}) {
  const { slug } = await params
  const sp = await searchParams
  const { tenant } = await requireTenantOwner(slug)

  async function handleUpdate(formData: FormData) {
    'use server'
    const result = await updateTenant(tenant.id, slug, formData)
    if (result.error) {
      redirect(`/dashboard/${slug}/settings?error=${encodeURIComponent(result.error)}`)
    }
    redirect(`/dashboard/${slug}/settings?success=1`)
  }

  return (
    <div className="space-y-6">
      <span className="section-label mb-2 block">[ SETTINGS ]</span>
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>

      {sp.success && (
        <div className="rounded-md bg-green/10 px-4 py-3 text-sm text-green">
          Settings saved successfully.
        </div>
      )}
      {sp.error && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {sp.error}
        </div>
      )}

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Business Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Business Name</Label>
              <Input id="name" name="name" defaultValue={tenant.name} required />
            </div>
            <div className="space-y-2">
              <Label>URL</Label>
              <p className="text-sm text-muted-foreground">courtflow.com/{tenant.slug}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" defaultValue={tenant.description || ''} rows={3} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cancellation_hours">Cancellation Window (hours)</Label>
              <p className="text-xs text-muted-foreground">
                Customers can cancel bookings up to this many hours before the start time.
              </p>
              <Input
                id="cancellation_hours"
                name="cancellation_hours"
                type="number"
                min="0"
                max="168"
                defaultValue={tenant.cancellation_hours ?? 24}
                className="w-32 font-mono"
              />
            </div>
            <Button type="submit"><span className="font-mono text-xs uppercase tracking-wider">Save Changes</span></Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
