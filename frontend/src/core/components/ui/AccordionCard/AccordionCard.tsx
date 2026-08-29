import { ChevronRight, Lock } from 'lucide-react'
import type { PropsWithChildren, ReactNode } from 'react'
import { useState } from 'react'

import { cn } from '@/core/functions/class-name'

export type AccordionCardVariant = 'base' | 'danger' | 'info' | 'warning' | 'violet'

export type AccordionCardProps = PropsWithChildren<{
  icon: ReactNode
  title: string
  description?: string
  variant?: AccordionCardVariant
  disabled?: boolean
  defaultOpen?: boolean
  className?: string
}>

type VariantStyles = {
  card: string
  icon: string
  title: string
  chevron: string
}

const variantStyles: Record<AccordionCardVariant, VariantStyles> = {
  base: {
    card: 'border-black/10 bg-white/35 dark:border-white/10 dark:bg-white/5',
    icon: 'text-black/70 dark:text-white/80',
    title: 'text-black/85 dark:text-white',
    chevron: 'text-black/40 dark:text-white/40',
  },
  danger: {
    card: 'border-rose-300/30 bg-rose-500/10 dark:border-rose-300/20 dark:bg-rose-500/5',
    icon: 'text-rose-600 dark:text-rose-400',
    title: 'text-rose-700 dark:text-rose-300',
    chevron: 'text-rose-600/50 dark:text-rose-400/50',
  },
  info: {
    card: 'border-sky-300/30 bg-sky-500/10 dark:border-sky-300/20 dark:bg-sky-500/5',
    icon: 'text-sky-600 dark:text-sky-400',
    title: 'text-sky-700 dark:text-sky-300',
    chevron: 'text-sky-600/50 dark:text-sky-400/50',
  },
  warning: {
    card: 'border-amber-300/40 bg-amber-500/10 dark:border-amber-300/25 dark:bg-amber-500/5',
    icon: 'text-amber-600 dark:text-amber-400',
    title: 'text-amber-700 dark:text-amber-300',
    chevron: 'text-amber-600/50 dark:text-amber-400/50',
  },
  violet: {
    card: 'border-violet-300/40 bg-violet-500/10 dark:border-violet-300/25 dark:bg-violet-500/5',
    icon: 'text-violet-600 dark:text-violet-400',
    title: 'text-violet-700 dark:text-violet-300',
    chevron: 'text-violet-600/50 dark:text-violet-400/50',
  },
}

export function AccordionCard({
  icon,
  title,
  description,
  variant = 'base',
  disabled = false,
  defaultOpen = false,
  className,
  children,
}: AccordionCardProps) {
  const [open, setOpen] = useState(defaultOpen)
  const styles = variantStyles[variant]
  const isOpen = disabled ? false : open

  return (
    <div
      className={cn(
        'w-full max-w-xl rounded-2xl border p-5',
        styles.card,
        disabled && 'opacity-50',
        className,
      )}
    >
      <button
        type="button"
        disabled={disabled}
        aria-expanded={isOpen}
        onClick={() => setOpen((current) => !current)}
        className={cn('flex w-full items-center gap-3 text-left', disabled && 'cursor-not-allowed')}
      >
        <span className={cn('shrink-0', styles.icon)}>{icon}</span>
        <span className="flex-1">
          <span className={cn('block font-medium', styles.title)}>{title}</span>
          {description ? (
            <span className="mt-1 block text-sm opacity-70">{description}</span>
          ) : null}
        </span>
        {disabled ? (
          <Lock size={18} className={cn('shrink-0', styles.chevron)} />
        ) : (
          <ChevronRight
            size={18}
            className={cn('shrink-0 transition-transform', isOpen && 'rotate-90', styles.chevron)}
          />
        )}
      </button>
      {isOpen && children ? <div className="mt-5">{children}</div> : null}
    </div>
  )
}
