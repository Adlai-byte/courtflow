'use client'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { CustomerMobileSidebar } from '@/components/customer/sidebar'
import { UserAvatar } from '@/components/shared/user-avatar'
import { Compass, User, LogOut } from 'lucide-react'
import Link from 'next/link'

interface CustomerTopbarProps {
  slug: string
  tenantName: string
  isAuthenticated: boolean
  profile: { full_name: string; avatar_url?: string | null; role?: string | null } | null
  signOutAction: () => void
}

export function CustomerTopbar({
  slug,
  tenantName,
  isAuthenticated,
  profile,
  signOutAction,
}: CustomerTopbarProps) {
  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-4">
      <div className="flex items-center gap-3">
        <CustomerMobileSidebar
          slug={slug}
          tenantName={tenantName}
          isAuthenticated={isAuthenticated}
          signOutAction={signOutAction}
        />
        <span className="font-mono text-sm font-medium tracking-tight md:hidden">
          {tenantName}
        </span>
      </div>
      {isAuthenticated && profile ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <UserAvatar avatarUrl={profile.avatar_url} fullName={profile.full_name} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{profile.full_name}</p>
                <p className="text-xs leading-none text-muted-foreground">Player</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link href={`/${slug}/profile`} className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/explore" className="cursor-pointer">
                  <Compass className="mr-2 h-4 w-4" />
                  Explore Facilities
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <form action={signOutAction}>
                <button type="submit" className="flex w-full items-center cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </button>
              </form>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Link
          href={`/login?redirect=/${slug}`}
          className="font-mono text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground"
        >
          Sign in
        </Link>
      )}
    </header>
  )
}
