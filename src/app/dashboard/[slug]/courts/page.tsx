import { requireTenantOwner } from '@/lib/tenant'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus } from 'lucide-react'
import { CourtForm } from './court-form'
import type { Court } from '@/lib/types'
import Link from 'next/link'

export default async function CourtsPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { tenant } = await requireTenantOwner(slug)

  const supabase = await createClient()
  const { data: courts } = await supabase
    .from('courts')
    .select('*')
    .eq('tenant_id', tenant.id)
    .order('created_at', { ascending: true })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <span className="section-label mb-2 block">[ COURTS ]</span>
          <h1 className="text-2xl font-bold tracking-tight">Courts</h1>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="font-mono text-xs uppercase tracking-wider">
              <Plus className="mr-2 h-4 w-4" />
              Add Court
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add a new court</DialogTitle>
            </DialogHeader>
            <CourtForm tenantId={tenant.id} slug={slug} />
          </DialogContent>
        </Dialog>
      </div>

      {(!courts || courts.length === 0) ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-sm text-muted-foreground">No courts yet. Add your first court to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {(courts as Court[]).map((court) => (
            <Link key={court.id} href={`/dashboard/${slug}/courts/${court.id}`}>
              <Card className="cursor-pointer transition-all hover:shadow-md hover:border-primary/20">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold">{court.name}</CardTitle>
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${court.is_active ? 'bg-green/10 text-green border-green/20' : 'bg-muted text-muted-foreground border-border'}`}>
                      {court.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-2 text-xs">
                    <Badge variant="outline" className="font-mono text-xs">{court.sport_type}</Badge>
                    <Badge variant="outline" className="font-mono text-xs">
                      {court.booking_mode === 'fixed_slot'
                        ? `${court.slot_duration_minutes}min`
                        : `${court.min_duration_minutes}-${court.max_duration_minutes}min`}
                    </Badge>
                  </div>
                  {court.description && (
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{court.description}</p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
