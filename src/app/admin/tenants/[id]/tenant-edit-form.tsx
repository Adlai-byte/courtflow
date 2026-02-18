'use client'

import { useTransition, useState } from 'react'
import { updateTenantAdmin } from '@/app/admin/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'

export function TenantEditForm({ tenant }: { tenant: any }) {
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await updateTenantAdmin(tenant.id, formData)
      if (result?.error) {
        setMessage({ type: 'error', text: result.error })
      } else {
        setMessage({ type: 'success', text: 'Tenant updated successfully' })
        setTimeout(() => setMessage(null), 3000)
      }
    })
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name" className="font-mono text-xs uppercase tracking-wider">
            Name
          </Label>
          <Input
            id="name"
            name="name"
            defaultValue={tenant.name}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cancellation_hours" className="font-mono text-xs uppercase tracking-wider">
            Cancellation Hours
          </Label>
          <Input
            id="cancellation_hours"
            name="cancellation_hours"
            type="number"
            min={0}
            defaultValue={tenant.cancellation_hours}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="description" className="font-mono text-xs uppercase tracking-wider">
          Description
        </Label>
        <Input
          id="description"
          name="description"
          defaultValue={tenant.description ?? ''}
          placeholder="Optional description"
        />
      </div>

      {message && (
        <p className={`font-mono text-xs ${message.type === 'error' ? 'text-destructive' : 'text-green'}`}>
          {message.text}
        </p>
      )}

      <Button type="submit" disabled={isPending} className="cta-button">
        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Save Changes
      </Button>
    </form>
  )
}
