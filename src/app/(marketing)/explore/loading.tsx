import { Skeleton } from '@/components/ui/skeleton'

export default function ExploreLoading() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-16">
      <Skeleton className="mb-8 h-4 w-28" />
      <Skeleton className="mb-4 h-4 w-24" />
      <Skeleton className="mb-4 h-10 w-64" />
      <Skeleton className="mb-10 h-5 w-96" />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
