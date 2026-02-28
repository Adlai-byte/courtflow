import { Skeleton } from '@/components/ui/skeleton'

export default function TenantLoading() {
  return (
    <div className="space-y-8">
      <div>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-2 h-5 w-72" />
      </div>
      <div>
        <Skeleton className="h-4 w-24" />
        <div className="mt-4 space-y-2">
          <Skeleton className="h-10 w-full" />
          <div className="grid grid-cols-4 gap-1">
            {Array.from({ length: 20 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        </div>
      </div>
      <div>
        <Skeleton className="h-4 w-36" />
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-border p-4 space-y-3">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
