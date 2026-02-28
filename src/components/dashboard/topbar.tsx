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
import { MobileSidebar } from '@/components/dashboard/sidebar'
import { UserAvatar } from '@/components/shared/user-avatar'
import { ExternalLink, Settings, LogOut } from 'lucide-react'
import Link from 'next/link'
import type { Profile, Tenant } from '@/lib/types'

export function Topbar({
  profile,
  tenant,
  slug,
  signOutAction,
}: {
  profile: Profile
  tenant: Tenant
  slug: string
  signOutAction: () => void
}) {
  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-4 md:px-6">
      <div className="flex items-center gap-3">
        <MobileSidebar slug={slug} tenantName={tenant.name} signOutAction={signOutAction} />
        <span className="section-label hidden sm:inline md:hidden">{tenant.name}</span>
      </div>
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
              <p className="text-xs leading-none text-muted-foreground capitalize">
                {profile.role?.replace('_', ' ')}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem asChild>
              <a href={`/${slug}`} target="_blank" rel="noopener noreferrer" className="cursor-pointer">
                <ExternalLink className="mr-2 h-4 w-4" />
                View Public Page
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/dashboard/${slug}/settings`} className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                Settings
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
    </header>
  )
}
