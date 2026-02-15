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
        <h1 className="text-3xl font-bold tracking-tight">Courts</h1>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Court
            </Button>
          </DialogTrigger>
          <DialogContent>
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
            <p className="text-muted-foreground">No courts yet. Add your first court to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {(courts as Court[]).map((court) => (
            <Link key={court.id} href={`/dashboard/${slug}/courts/${court.id}`}>
              <Card className="cursor-pointer transition-shadow hover:shadow-md">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{court.name}</CardTitle>
                    <Badge variant={court.is_active ? 'default' : 'secondary'}>
                      {court.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Badge variant="outline">{court.sport_type}</Badge>
                    <Badge variant="outline">
                      {court.booking_mode === 'fixed_slot'
                        ? `${court.slot_duration_minutes}min slots`
                        : `${court.min_duration_minutes}-${court.max_duration_minutes}min`}
                    </Badge>
                  </div>
                  {court.description && (
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                      {court.description}
                    </p>
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
