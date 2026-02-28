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
import { AdminMobileSidebar } from '@/components/admin/sidebar'
import { UserAvatar } from '@/components/shared/user-avatar'
import { Home, Compass, LogOut } from 'lucide-react'
import Link from 'next/link'
import type { Profile } from '@/lib/types'

export function AdminTopbar({
  profile,
  signOutAction,
}: {
  profile: Profile
  signOutAction: () => void
}) {
  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-4 md:px-6">
      <div className="flex items-center gap-3">
        <AdminMobileSidebar signOutAction={signOutAction} />
        <span className="section-label hidden sm:inline md:hidden">Platform Admin</span>
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
              <p className="text-xs leading-none text-muted-foreground">Platform Admin</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem asChild>
              <Link href="/" className="cursor-pointer">
                <Home className="mr-2 h-4 w-4" />
                Landing Page
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/explore" className="cursor-pointer">
                <Compass className="mr-2 h-4 w-4" />
                Explore
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
