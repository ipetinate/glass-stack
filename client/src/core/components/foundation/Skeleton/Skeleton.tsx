import type { ComponentPropsWithoutRef } from 'react'

import { cn } from '@/core/functions/class-name'

type SkeletonProps = ComponentPropsWithoutRef<'div'>

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'animate-pulse rounded-lg bg-[#151A21]/10 dark:bg-white/10',
        className,
      )}
      {...props}
    />
  )
}
