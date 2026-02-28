'use client'

import { useTransition, useState, useRef } from 'react'
import { createPartner, updatePartner, deletePartner, uploadPartnerLogo } from '../actions'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ImagePlus, Loader2, Trash2, X } from 'lucide-react'

interface PartnerFormProps {
  partner: {
    id: string
    name: string
    logo_url: string
    website_url: string | null
    sort_order: number
    is_active: boolean
  } | null
}

export function PartnerForm({ partner }: PartnerFormProps) {
  const isNew = !partner
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [logoUrl, setLogoUrl] = useState<string | null>(partner?.logo_url ?? null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isActive, setIsActive] = useState(partner?.is_active ?? true)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'].includes(file.type)) {
      setUploadError('Only JPEG, PNG, WebP, and SVG images are allowed.')
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      setUploadError('Image must be under 2MB.')
      return
    }

    setUploadError(null)
    setUploading(true)

    const fd = new FormData()
    fd.append('file', file)
    const result = await uploadPartnerLogo(fd)

    if (result.error) {
      setUploadError(result.error)
    } else if (result.url) {
      setLogoUrl(result.url)
    }
    setUploading(false)
  }

  function handleSubmit(formData: FormData) {
    if (!logoUrl) {
      setMessage({ type: 'error', text: 'Please upload a logo first.' })
      return
    }

    formData.set('logo_url', logoUrl)
    formData.set('is_active', String(isActive))

    startTransition(async () => {
      const result = isNew
        ? await createPartner(formData)
        : await updatePartner(partner!.id, formData)

      if (result?.error) {
        setMessage({ type: 'error', text: result.error })
      } else if (!isNew) {
        setMessage({ type: 'success', text: 'Partner updated successfully' })
        setTimeout(() => setMessage(null), 3000)
      }
    })
  }

  function handleDelete() {
    startTransition(async () => {
      await deletePartner(partner!.id)
    })
  }

  return (
    <Card className="max-w-2xl">
      <CardContent className="p-6">
        <form action={handleSubmit} className="space-y-6">
          {/* Logo upload */}
          <div className="space-y-2">
            <Label className="font-mono text-xs uppercase tracking-wider">Logo</Label>
            {logoUrl ? (
              <div className="relative inline-block">
                <div className="flex h-24 w-48 items-center justify-center rounded-md border border-border bg-muted/30 p-3">
                  <img
                    src={logoUrl}
                    alt="Partner logo"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute -right-2 -top-2 h-6 w-6"
                  onClick={() => {
                    setLogoUrl(null)
                    if (inputRef.current) inputRef.current.value = ''
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className="flex h-24 w-48 items-center justify-center rounded-md border-2 border-dashed border-border bg-muted/30 text-muted-foreground transition-colors hover:border-primary/30 hover:bg-muted/50"
              >
                <div className="flex flex-col items-center gap-1">
                  {uploading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <ImagePlus className="h-5 w-5" />
                  )}
                  <span className="font-mono text-xs">
                    {uploading ? 'Uploading...' : 'Upload Logo'}
                  </span>
                </div>
              </button>
            )}
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/svg+xml"
              onChange={handleUpload}
              className="hidden"
            />
            {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}
          </div>

          {/* Fields */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name" className="font-mono text-xs uppercase tracking-wider">
                Partner Name
              </Label>
              <Input
                id="name"
                name="name"
                defaultValue={partner?.name ?? ''}
                required
                placeholder="Acme Corp"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sort_order" className="font-mono text-xs uppercase tracking-wider">
                Sort Order
              </Label>
              <Input
                id="sort_order"
                name="sort_order"
                type="number"
                min={0}
                defaultValue={partner?.sort_order ?? 0}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="website_url" className="font-mono text-xs uppercase tracking-wider">
              Website URL
            </Label>
            <Input
              id="website_url"
              name="website_url"
              type="url"
              defaultValue={partner?.website_url ?? ''}
              placeholder="https://example.com"
            />
          </div>

          <div className="flex items-center gap-3">
            <Switch
              id="is_active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
            <Label htmlFor="is_active" className="font-mono text-xs uppercase tracking-wider cursor-pointer">
              Active (visible on landing page)
            </Label>
          </div>

          {message && (
            <p className={`font-mono text-xs ${message.type === 'error' ? 'text-destructive' : 'text-green'}`}>
              {message.text}
            </p>
          )}

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={isPending} className="cta-button">
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isNew ? 'Create Partner' : 'Save Changes'}
            </Button>

            {!isNew && (
              <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <DialogTrigger asChild>
                  <Button type="button" variant="destructive" size="sm" className="gap-2">
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Delete &quot;{partner.name}&quot;?</DialogTitle>
                    <DialogDescription>
                      This will permanently remove this partner and its logo. This action cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={isPending}>
                      Cancel
                    </Button>
                    <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
                      {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Delete Permanently
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
