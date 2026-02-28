import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { PartnerForm } from './partner-form'

export default async function PartnerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const isNew = id === 'new'

  let partner = null
  if (!isNew) {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('partners')
      .select('*')
      .eq('id', id)
      .single()
    if (!data) notFound()
    partner = data
  }

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/admin/partners"
          className="mb-4 inline-flex items-center gap-1 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> Back to Partners
        </Link>
        <span className="section-label mb-2 block">
          {isNew ? '[ NEW PARTNER ]' : '[ EDIT PARTNER ]'}
        </span>
        <h1 className="text-2xl font-bold tracking-tight">
          {isNew ? 'Add Partner' : partner.name}
        </h1>
      </div>

      <PartnerForm partner={partner} />
    </div>
  )
}
