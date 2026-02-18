'use client'

import { useTransition, useState } from 'react'
import { updateUserRole } from '@/app/admin/actions'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import type { UserRole } from '@/lib/types'

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'platform_admin', label: 'Platform Admin' },
  { value: 'business_owner', label: 'Business Owner' },
  { value: 'customer', label: 'Customer' },
]

export function UserRoleChanger({ userId, currentRole }: { userId: string; currentRole: UserRole }) {
  const [isPending, startTransition] = useTransition()
  const [role, setRole] = useState<UserRole>(currentRole)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  function handleSave() {
    if (role === currentRole) return
    startTransition(async () => {
      const result = await updateUserRole(userId, role)
      if (result?.error) {
        setMessage({ type: 'error', text: result.error })
      } else {
        setMessage({ type: 'success', text: 'Role updated successfully' })
        setTimeout(() => setMessage(null), 3000)
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="space-y-2 sm:min-w-[200px]">
          <Label className="font-mono text-xs uppercase tracking-wider">
            User Role
          </Label>
          <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={handleSave}
          disabled={isPending || role === currentRole}
          className="cta-button"
        >
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Update Role
        </Button>
      </div>
      {message && (
        <p className={`font-mono text-xs ${message.type === 'error' ? 'text-destructive' : 'text-green'}`}>
          {message.text}
        </p>
      )}
    </div>
  )
}
