'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { updateOperatingHours } from '@/app/dashboard/[slug]/courts/[id]/actions'
import type { OperatingHours } from '@/lib/types'

const DAYS = [
  { key: 'mon', label: 'Monday' },
  { key: 'tue', label: 'Tuesday' },
  { key: 'wed', label: 'Wednesday' },
  { key: 'thu', label: 'Thursday' },
  { key: 'fri', label: 'Friday' },
  { key: 'sat', label: 'Saturday' },
  { key: 'sun', label: 'Sunday' },
]

interface Props {
  courtId: string
  slug: string
  initialHours: OperatingHours
}

export function OperatingHoursEditor({ courtId, slug, initialHours }: Props) {
  const [hours, setHours] = useState<OperatingHours>(initialHours)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  function toggleDay(day: string) {
    setHours((prev) => {
      const next = { ...prev }
      if (next[day]) {
        delete next[day]
      } else {
        next[day] = { open: '06:00', close: '22:00' }
      }
      return next
    })
  }

  function updateTime(day: string, field: 'open' | 'close', value: string) {
    setHours((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }))
  }

  async function handleSave() {
    setSaving(true)
    setMessage(null)
    const result = await updateOperatingHours(courtId, slug, hours)
    if (result.error) {
      setMessage(result.error)
    } else {
      setMessage('Saved!')
      setTimeout(() => setMessage(null), 2000)
    }
    setSaving(false)
  }

  return (
    <div className="space-y-3">
      {DAYS.map(({ key, label }) => {
        const enabled = !!hours[key]
        return (
          <div key={key} className="flex items-center gap-4">
            <Switch checked={enabled} onCheckedChange={() => toggleDay(key)} />
            <span className="w-24 font-mono text-sm">{label}</span>
            {enabled ? (
              <div className="flex items-center gap-2">
                <Input
                  type="time"
                  value={hours[key].open}
                  onChange={(e) => updateTime(key, 'open', e.target.value)}
                  className="w-32 font-mono text-sm"
                />
                <span className="text-xs text-muted-foreground">to</span>
                <Input
                  type="time"
                  value={hours[key].close}
                  onChange={(e) => updateTime(key, 'close', e.target.value)}
                  className="w-32 font-mono text-sm"
                />
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">Closed</span>
            )}
          </div>
        )
      })}
      <div className="flex items-center gap-3 pt-2">
        <Button onClick={handleSave} disabled={saving} size="sm">
          <span className="font-mono text-xs uppercase tracking-wider">
            {saving ? 'Saving...' : 'Save Hours'}
          </span>
        </Button>
        {message && (
          <span className={`text-sm ${message === 'Saved!' ? 'text-primary' : 'text-destructive'}`}>
            {message}
          </span>
        )}
      </div>
    </div>
  )
}
