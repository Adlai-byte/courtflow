import Link from 'next/link'

export default function TenantNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="text-center">
        <span className="section-label mb-6 block">[ 404 ]</span>
        <h1 className="text-2xl font-bold tracking-tight">Facility not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We couldn&apos;t find the facility you&apos;re looking for.
        </p>
        <Link
          href="/explore"
          className="cta-button mt-8 inline-flex rounded-none px-6 py-3 text-xs"
        >
          Browse facilities
        </Link>
      </div>
    </div>
  )
}
