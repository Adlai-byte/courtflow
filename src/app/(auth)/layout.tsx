import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen">
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>
      {/* Left branding panel — desktop only */}
      <div className="relative hidden w-[480px] shrink-0 flex-col justify-between overflow-hidden bg-foreground p-10 text-background lg:flex">
        {/* Decorative grid lines */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.04]">
          <div className="h-full w-full" style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }} />
        </div>

        {/* Top: logo + back link */}
        <div className="relative z-10">
          <Link href="/" className="group inline-flex items-center gap-2 font-mono text-sm tracking-tight text-background/70 transition-colors hover:text-background">
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
            Back to home
          </Link>
          <div className="mt-10">
            <span className="font-mono text-2xl font-medium tracking-tight">CourtFLOW</span>
          </div>
        </div>

        {/* Middle: tagline */}
        <div className="relative z-10 -mt-12">
          <p className="text-3xl font-bold leading-tight tracking-tight">
            Your court is
            <br />
            waiting.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-background/50">
            Find available courts, reserve your spot in seconds,
            and never miss a game.
          </p>
        </div>

        {/* Bottom: accent bar */}
        <div className="relative z-10">
          <div className="h-1 w-16 rounded-full bg-primary" />
          <p className="mt-4 font-mono text-[10px] uppercase tracking-widest text-background/30">
            Court booking made simple
          </p>
        </div>
      </div>

      {/* Right side — form area */}
      <div className="flex flex-1 flex-col">
        {/* Mobile header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 lg:hidden">
          <Link href="/" className="font-mono text-sm font-medium tracking-tight">
            CourtFLOW
          </Link>
          <Link href="/" className="inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="h-3 w-3" />
            Home
          </Link>
        </div>

        {/* Centered form */}
        <main id="main-content" className="flex flex-1 items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
