'use client'

import { AvatarUpload } from './avatar-upload'
import { updateAvatarUrl } from '@/app/[slug]/profile/actions'

interface ProfileAvatarSectionProps {
  userId: string
  slug: string
  currentAvatarUrl: string | null
  fullName: string | null
}

export function ProfileAvatarSection({ userId, slug, currentAvatarUrl, fullName }: ProfileAvatarSectionProps) {
  async function handleUploaded(url: string) {
    await updateAvatarUrl(slug, url)
  }

  return (
    <AvatarUpload
      userId={userId}
      currentAvatarUrl={currentAvatarUrl}
      fullName={fullName}
      onUploaded={handleUploaded}
    />
  )
}
