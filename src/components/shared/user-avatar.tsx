import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

const sizeClasses = {
  sm: 'h-6 w-6',
  default: 'h-8 w-8',
  lg: 'h-10 w-10',
  xl: 'h-16 w-16',
} as const

const textClasses = {
  sm: 'text-[10px]',
  default: 'text-xs',
  lg: 'text-sm',
  xl: 'text-xl',
} as const

function getInitials(name: string | null | undefined): string {
  if (!name) return 'U'
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

interface UserAvatarProps {
  avatarUrl?: string | null
  fullName?: string | null
  size?: keyof typeof sizeClasses
  className?: string
}

export function UserAvatar({ avatarUrl, fullName, size = 'default', className }: UserAvatarProps) {
  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      {avatarUrl && <AvatarImage src={avatarUrl} alt={fullName || 'User'} />}
      <AvatarFallback className={cn('bg-primary/10 text-primary font-mono', textClasses[size])}>
        {getInitials(fullName)}
      </AvatarFallback>
    </Avatar>
  )
}
