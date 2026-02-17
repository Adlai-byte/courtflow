import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { MobileMarketingNav } from '@/components/marketing/mobile-nav'

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="noise-bg relative min-h-screen bg-background">
      {/* Nav */}
      <header className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="font-mono text-sm font-medium tracking-tight">
          CourtFLOW
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          <Link href="#features" className="font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground">
            Features
          </Link>
          <Link href="#how-it-works" className="font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground">
            How it works
          </Link>
        </nav>
        <div className="flex items-center gap-4">
          <MobileMarketingNav />
          <Link href="/login" className="font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground">
            Sign in
          </Link>
          <Link
            href="/signup"
            className="cta-button rounded-none px-5 py-2.5 text-xs"
          >
            Get started <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      {children}
    </div>
  )
}
