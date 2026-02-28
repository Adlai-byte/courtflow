'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { ImagePlus, X } from 'lucide-react'

interface CourtImageUploadProps {
  tenantId: string
  courtId?: string
  currentImageUrl?: string | null
  onImageUrlChange: (url: string | null) => void
}

export function CourtImageUpload({ tenantId, courtId, currentImageUrl, onImageUrlChange }: CourtImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentImageUrl || null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Only JPEG, PNG, and WebP images are allowed.')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be under 5MB.')
      return
    }

    setError(null)
    setUploading(true)

    const ext = file.name.split('.').pop()
    const id = courtId || 'new'
    const path = `${tenantId}/${id}-${Date.now()}.${ext}`

    const supabase = createClient()
    const { error: uploadError } = await supabase.storage
      .from('court-images')
      .upload(path, file, { upsert: true })

    if (uploadError) {
      setError(uploadError.message)
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from('court-images')
      .getPublicUrl(path)

    setPreview(publicUrl)
    onImageUrlChange(publicUrl)
    setUploading(false)
  }

  function handleRemove() {
    setPreview(null)
    onImageUrlChange(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="space-y-2">
      <Label>Court Image</Label>
      {preview ? (
        <div className="relative">
          <img
            src={preview}
            alt="Court preview"
            className="h-32 w-full rounded-lg border border-border object-cover"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute right-2 top-2 h-6 w-6"
            onClick={handleRemove}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex h-32 w-full items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30 text-muted-foreground transition-colors hover:border-primary/30 hover:bg-muted/50"
        >
          <div className="flex flex-col items-center gap-1">
            <ImagePlus className="h-6 w-6" />
            <span className="font-mono text-xs">
              {uploading ? 'Uploading...' : 'Upload Image'}
            </span>
          </div>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
