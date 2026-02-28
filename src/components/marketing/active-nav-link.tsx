'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface ActiveNavLinkProps {
  href: string
  className?: string
  children: React.ReactNode
}

export function ActiveNavLink({ href, className, children }: ActiveNavLinkProps) {
  const pathname = usePathname()
  const isAnchor = href.startsWith('#')
  const isActive = !isAnchor && pathname === href

  return (
    <Link
      href={href}
      className={cn(className, isActive && 'text-foreground')}
    >
      {children}
    </Link>
  )
}
