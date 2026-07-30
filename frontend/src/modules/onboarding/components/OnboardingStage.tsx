import type { ReactNode } from 'react'
import { Check } from 'lucide-react'

import { cn } from '@/core/functions/class-name'

export function OnboardingStage({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn('mx-auto w-full max-w-3xl pb-4', className)}>{children}</section>
}

export function OnboardingStageTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="sticky top-0 z-10 -mx-2 bg-white/10 px-2 pb-3 text-3xl font-extralight backdrop-blur-md sm:text-4xl dark:bg-black/10">
      {children}
    </h2>
  )
}

export function OnboardingCheck({ children, valid }: { children: ReactNode; valid: boolean }) {
  return (
    <p className={cn('flex items-center gap-2 text-xs', valid ? 'text-emerald-500 dark:text-emerald-300' : 'opacity-60')}>
      <Check aria-hidden="true" className="size-3.5 shrink-0" strokeWidth={2.5} />
      {children}
    </p>
  )
}
