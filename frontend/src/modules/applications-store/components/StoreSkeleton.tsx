import { Skeleton } from '@/core/components/foundation/Skeleton'

export function StoreSkeleton() {
  return (
    <div role="status" aria-label="Carregando aplicativos" className="grid gap-5 md:grid-cols-2">
      <Skeleton className="h-52 rounded-2xl" />
      <Skeleton className="h-52 rounded-2xl" />
    </div>
  )
}

