import { createAdminClient } from '@/lib/supabase/admin'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { PartnerActiveToggle } from './partner-active-toggle'

export default async function AdminPartnersPage() {
  const supabase = createAdminClient()

  const { data: partners } = await supabase
    .from('partners')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <span className="section-label mb-2 block">[ PARTNERS ]</span>
          <h1 className="text-2xl font-bold tracking-tight">Partner Logos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {partners?.length ?? 0} {(partners?.length ?? 0) === 1 ? 'partner' : 'partners'} — displayed on the landing page carousel
          </p>
        </div>
        <Link
          href="/admin/partners/new"
          className="cta-button rounded-none text-sm"
        >
          <Plus className="h-4 w-4" />
          Add Partner
        </Link>
      </div>

      {(!partners || partners.length === 0) ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <p className="text-sm text-muted-foreground">No partners yet.</p>
            <Link
              href="/admin/partners/new"
              className="mt-4 font-mono text-xs text-primary transition-colors hover:text-primary/80"
            >
              Add your first partner
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {partners.map((partner: any) => (
            <Card key={partner.id} className="group relative overflow-hidden">
              <CardContent className="p-4">
                <div className="mb-4 flex h-20 items-center justify-center rounded-md border border-border bg-muted/30">
                  <img
                    src={partner.logo_url}
                    alt={partner.name}
                    className="max-h-14 max-w-[80%] object-contain"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium">{partner.name}</h3>
                    <p className="font-mono text-xs text-muted-foreground">
                      Order: {partner.sort_order}
                    </p>
                  </div>
                  <PartnerActiveToggle id={partner.id} isActive={partner.is_active} />
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <Link
                    href={`/admin/partners/${partner.id}`}
                    className="font-mono text-xs text-primary transition-colors hover:text-primary/80"
                  >
                    Edit
                  </Link>
                  {partner.website_url && (
                    <a
                      href={partner.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
                    >
                      Website
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
