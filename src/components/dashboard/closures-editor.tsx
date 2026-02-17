'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X } from 'lucide-react'
import { addClosure, removeClosure } from '@/app/dashboard/[slug]/courts/[id]/actions'
import type { CourtClosure } from '@/lib/types'

interface Props {
  courtId: string
  slug: string
  initialClosures: CourtClosure[]
}

export function ClosuresEditor({ courtId, slug, initialClosures }: Props) {
  const [closures, setClosures] = useState<CourtClosure[]>(initialClosures)
  const [date, setDate] = useState('')
  const [reason, setReason] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAdd() {
    if (!date) return
    setAdding(true)
    setError(null)
    const result = await addClosure(courtId, slug, date, reason || null)
    if (result.error) {
      setError(result.error)
    } else {
      setClosures((prev) => [...prev, {
        id: crypto.randomUUID(),
        court_id: courtId,
        date,
        reason: reason || null,
        created_at: new Date().toISOString(),
      }].sort((a, b) => a.date.localeCompare(b.date)))
      setDate('')
      setReason('')
    }
    setAdding(false)
  }

  async function handleRemove(closureId: string) {
    const result = await removeClosure(closureId, courtId, slug)
    if (!result.error) {
      setClosures((prev) => prev.filter((c) => c.id !== closureId))
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Date</label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-40 font-mono text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Reason (optional)</label>
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Holiday, maintenance..."
            className="w-56 text-sm"
          />
        </div>
        <Button onClick={handleAdd} disabled={adding || !date} size="sm">
          <span className="font-mono text-xs uppercase tracking-wider">Add Closure</span>
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}

      {closures.length === 0 ? (
        <p className="text-sm text-muted-foreground">No closure dates set.</p>
      ) : (
        <div className="space-y-1">
          {closures.map((closure) => (
            <div key={closure.id} className="flex items-center justify-between rounded border px-3 py-2">
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm">{closure.date}</span>
                {closure.reason && (
                  <span className="text-sm text-muted-foreground">{closure.reason}</span>
                )}
              </div>
              <button onClick={() => handleRemove(closure.id)} className="text-muted-foreground hover:text-destructive">
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
