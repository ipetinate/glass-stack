import type { ReactNode } from 'react'

import { Check } from 'lucide-react'

import { cn } from '@/core/functions/class-name'

export type SelectableCardProps = {
  ariaLabel?: string
  children: ReactNode
  description: string
  disabled?: boolean
  selected?: boolean
  selectedIndicatorPosition?: 'bottom-right' | 'top-right'
  title: string
  className?: string
  onSelect: () => void
}

export function SelectableCard({
  ariaLabel,
  children,
  className,
  description,
  disabled = false,
  selected = false,
  selectedIndicatorPosition = 'top-right',
  title,
  onSelect,
}: SelectableCardProps) {
  const selectedIndicatorPositionClass =
    selectedIndicatorPosition === 'bottom-right'
      ? 'bottom-3 right-3'
      : 'right-3 top-3'

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={disabled}
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        'group relative flex min-h-54 cursor-pointer flex-col gap-3 rounded-xl border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-55',
        selected
          ? 'border-sky-500/80 bg-white/70 text-[#151A21] shadow-sm dark:border-sky-400/80 dark:bg-white/10 dark:text-white'
          : 'border-black/10 bg-white/35 text-[#151A21]/70 hover:text-[#151A21] dark:border-white/10 dark:bg-white/5 dark:text-white/70 dark:hover:text-white',
        className,
      )}
    >
      {selected && (
        <span
          className={cn(
            'absolute z-10 flex size-7 items-center justify-center rounded-full border border-white/60 bg-white/45 text-emerald-500 backdrop-blur-md dark:border-white/10 dark:bg-black/35 dark:text-emerald-400',
            selectedIndicatorPositionClass,
          )}
        >
          <Check aria-hidden="true" className="size-4" />
        </span>
      )}

      {children}

      <span className="flex min-h-17 flex-col">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="mt-1 block min-h-8 text-xs text-[#151A21]/50 dark:text-white/45">
          {description}
        </span>
      </span>
    </button>
  )
}
