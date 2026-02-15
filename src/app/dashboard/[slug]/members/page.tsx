import { requireTenantOwner } from '@/lib/tenant'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export default async function MembersPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { tenant } = await requireTenantOwner(slug)

  const supabase = await createClient()
  const { data: subscriptions } = await supabase
    .from('member_subscriptions')
    .select(`
      *,
      profiles:customer_id ( full_name, phone ),
      membership_tiers:tier_id ( name )
    `)
    .eq('tenant_id', tenant.id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Members</h1>

      <Card>
        <CardContent className="p-0">
          {(!subscriptions || subscriptions.length === 0) ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">No members yet. Assign customers to membership tiers to see them here.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>Free Hours Left</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions.map((sub: any) => (
                  <TableRow key={sub.id}>
                    <TableCell>{sub.profiles?.full_name || 'Unknown'}</TableCell>
                    <TableCell>{sub.membership_tiers?.name}</TableCell>
                    <TableCell>
                      <Badge variant={sub.status === 'active' ? 'default' : 'secondary'}>
                        {sub.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{sub.start_date}</TableCell>
                    <TableCell>{sub.free_hours_remaining}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
