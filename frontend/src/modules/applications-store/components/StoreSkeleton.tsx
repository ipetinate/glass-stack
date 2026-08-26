import { Skeleton } from '@/core/components/foundation/Skeleton'

export function StoreSkeleton() {
  return (
    <div role="status" aria-label="Loading apps" className="space-y-5">
      <Skeleton className="h-72 rounded-2xl" />
      <Skeleton className="h-12 rounded-xl" />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Skeleton className="h-44 rounded-2xl" />
        <Skeleton className="h-44 rounded-2xl" />
        <Skeleton className="h-44 rounded-2xl" />
        <Skeleton className="h-44 rounded-2xl" />
      </div>
    </div>
  )
}

