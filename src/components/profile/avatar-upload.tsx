'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Camera, Loader2 } from 'lucide-react'
import { UserAvatar } from '@/components/shared/user-avatar'

interface AvatarUploadProps {
  userId: string
  currentAvatarUrl: string | null
  fullName: string | null
  onUploaded: (url: string) => void
}

export function AvatarUpload({ userId, currentAvatarUrl, fullName, onUploaded }: AvatarUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentAvatarUrl)
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

    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be under 2MB.')
      return
    }

    setError(null)
    setUploading(true)

    const supabase = createClient()

    // Clean up old avatar files
    const { data: existingFiles } = await supabase.storage
      .from('avatars')
      .list(userId)

    if (existingFiles && existingFiles.length > 0) {
      const paths = existingFiles.map((f) => `${userId}/${f.name}`)
      await supabase.storage.from('avatars').remove(paths)
    }

    // Upload new avatar
    const ext = file.name.split('.').pop()
    const path = `${userId}/${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true })

    if (uploadError) {
      setError(uploadError.message)
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(path)

    setPreview(publicUrl)
    onUploaded(publicUrl)
    setUploading(false)
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="group relative rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        <UserAvatar avatarUrl={preview} fullName={fullName} size="xl" />
        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 transition-colors group-hover:bg-black/40">
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin text-white" />
          ) : (
            <Camera className="h-5 w-5 text-white opacity-0 transition-opacity group-hover:opacity-100" />
          )}
        </div>
      </button>
      <span className="font-mono text-xs text-muted-foreground">
        {uploading ? 'Uploading...' : 'Click to change photo'}
      </span>
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
