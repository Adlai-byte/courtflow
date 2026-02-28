import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="text-center">
        <span className="section-label mb-6 block">[ 404 ]</span>
        <h1 className="text-3xl font-bold tracking-tight">Page not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/"
          className="cta-button mt-8 inline-flex rounded-none px-6 py-3 text-xs"
        >
          Back to home
        </Link>
      </div>
    </div>
  )
}
