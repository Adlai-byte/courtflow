'use client'

import Link from 'next/link'

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="text-center">
        <span className="section-label mb-6 block">[ AUTH ERROR ]</span>
        <h1 className="text-2xl font-bold tracking-tight">Authentication error</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong during authentication.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <button onClick={reset} className="cta-button rounded-none px-6 py-3 text-xs">
            Try again
          </button>
          <Link
            href="/login"
            className="font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
