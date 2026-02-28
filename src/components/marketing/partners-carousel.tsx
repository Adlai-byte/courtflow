import { createAdminClient } from '@/lib/supabase/admin'

export async function PartnersCarousel() {
  const supabase = createAdminClient()

  const { data: partners } = await supabase
    .from('partners')
    .select('id, name, logo_url, website_url')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (!partners || partners.length === 0) return null

  // Duplicate for seamless infinite loop
  const logos = [...partners, ...partners]

  return (
    <section className="mx-auto max-w-7xl px-6 py-16">
      <div className="mb-8 text-center">
        <span className="section-label">[ TRUSTED BY ]</span>
      </div>
      <div className="relative overflow-hidden">
        {/* Fade edges */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-background to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-background to-transparent" />

        <div className="partner-scroll flex w-max items-center gap-16">
          {logos.map((partner, i) => {
            const logo = (
              <img
                src={partner.logo_url}
                alt={partner.name}
                className="h-8 max-w-[120px] object-contain grayscale opacity-60 transition-all duration-300 hover:grayscale-0 hover:opacity-100"
              />
            )

            return partner.website_url ? (
              <a
                key={`${partner.id}-${i}`}
                href={partner.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0"
              >
                {logo}
              </a>
            ) : (
              <div key={`${partner.id}-${i}`} className="shrink-0">
                {logo}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
