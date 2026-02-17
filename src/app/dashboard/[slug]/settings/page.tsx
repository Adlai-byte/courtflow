import { requireTenantOwner } from '@/lib/tenant'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { updateTenant } from './actions'

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { tenant } = await requireTenantOwner(slug)

  async function handleUpdate(formData: FormData) {
    'use server'
    await updateTenant(tenant.id, slug, formData)
  }

  return (
    <div className="space-y-6">
      <span className="section-label mb-2 block">[ SETTINGS ]</span>
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>

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
            <Button type="submit"><span className="font-mono text-xs uppercase tracking-wider">Save Changes</span></Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
