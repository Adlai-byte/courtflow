'use client'

import { useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

interface SubmitButtonProps {
  children: React.ReactNode
  className?: string
  pendingText?: string
}

export function SubmitButton({ children, className, pendingText }: SubmitButtonProps) {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" className={className} disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {pendingText || 'Saving...'}
        </>
      ) : (
        children
      )}
    </Button>
  )
}
