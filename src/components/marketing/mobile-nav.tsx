'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Menu } from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'

export function MobileMarketingNav() {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-64 p-6">
        <nav className="flex flex-col gap-4 mt-8" onClick={() => setOpen(false)}>
          <Link href="#features" className="font-mono text-sm uppercase tracking-wider text-muted-foreground hover:text-foreground">
            Features
          </Link>
          <Link href="#how-it-works" className="font-mono text-sm uppercase tracking-wider text-muted-foreground hover:text-foreground">
            How it works
          </Link>
          <hr className="border-border" />
          <Link href="/login" className="font-mono text-sm uppercase tracking-wider text-muted-foreground hover:text-foreground">
            Sign in
          </Link>
          <Link href="/signup" className="cta-button rounded-none px-5 py-2.5 text-xs justify-center">
            Get started
          </Link>
        </nav>
      </SheetContent>
    </Sheet>
  )
}
