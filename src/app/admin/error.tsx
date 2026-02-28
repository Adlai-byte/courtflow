'use client'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6">
      <div className="text-center">
        <span className="section-label mb-6 block">[ ADMIN ERROR ]</span>
        <h1 className="text-2xl font-bold tracking-tight">Admin error</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong in the admin panel.
        </p>
        <button onClick={reset} className="cta-button mt-8 rounded-none px-6 py-3 text-xs">
          Try again
        </button>
      </div>
    </div>
  )
}
