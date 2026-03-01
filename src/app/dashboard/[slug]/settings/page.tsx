import { redirect } from 'next/navigation'
import { requireTenantOwner } from '@/lib/tenant'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SubmitButton } from '@/components/shared/submit-button'
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

      <form action={handleUpdate} className="max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Business Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
              <Label htmlFor="city">City</Label>
              <Input id="city" name="city" defaultValue={tenant.city || ''} placeholder="e.g. Cebu City" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" name="address" defaultValue={tenant.address || ''} placeholder="Full address" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_phone">Contact Phone</Label>
              <Input id="contact_phone" name="contact_phone" defaultValue={tenant.contact_phone || ''} placeholder="09XX XXX XXXX" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Booking &amp; Payment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <Label htmlFor="auto_approve">Auto-approve bookings</Label>
                <p className="text-xs text-muted-foreground">
                  When enabled, bookings are instantly confirmed without manual approval.
                </p>
              </div>
              <input type="hidden" name="auto_approve" value="false" />
              <input
                type="checkbox"
                id="auto_approve"
                name="auto_approve"
                value="true"
                defaultChecked={tenant.auto_approve ?? true}
                className="h-4 w-4 rounded border-gray-300"
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <Label htmlFor="require_payment">Require online payment</Label>
                <p className="text-xs text-muted-foreground">
                  Customers must pay via GCash/Maya when booking. Disable for pay-at-venue.
                </p>
              </div>
              <input type="hidden" name="require_payment" value="false" />
              <input
                type="checkbox"
                id="require_payment"
                name="require_payment"
                value="true"
                defaultChecked={tenant.require_payment ?? false}
                className="h-4 w-4 rounded border-gray-300"
              />
            </div>
          </CardContent>
        </Card>

        <SubmitButton pendingText="Saving..."><span className="font-mono text-xs uppercase tracking-wider">Save Changes</span></SubmitButton>
      </form>
    </div>
  )
}
