import { motion } from 'motion/react'
import { useId, useState, type ChangeEvent } from 'react'

import { cn } from '@/core/functions/class-name'

export type SegmentedControlOption<T extends string> = {
  value: T
  label: string
}

export type SegmentedControlProps<T extends string> = {
  options: SegmentedControlOption<T>[]
  value?: T
  defaultValue?: T
  onValueChange?: (value: T) => void
  name?: string
  className?: string
  size?: 'xs' | 'md' | 'lg'
  'aria-label'?: string
}

export function SegmentedControl<T extends string>({
  options,
  value,
  defaultValue,
  onValueChange,
  name,
  className,
  size = 'md',
  'aria-label': ariaLabel,
}: SegmentedControlProps<T>) {
  const generatedName = useId()
  const [internalValue, setInternalValue] = useState<T>(
    value ?? defaultValue ?? options[0]?.value,
  )
  const selectedValue = value ?? internalValue

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value as T
    if (value === undefined) setInternalValue(nextValue)
    onValueChange?.(nextValue)
  }

  return (
    <div
      className={cn(
        'inline-flex border border-white/20 bg-black/10',
        size === 'xs'
          ? 'gap-0.5 rounded-lg p-0.5'
          : size === 'lg'
            ? 'gap-1.5 rounded-xl p-1.5'
            : 'gap-1 rounded-xl p-1',
        className,
      )}
      role="group"
      aria-label={ariaLabel}
    >
      {options.map((option) => {
        const id = `${generatedName}-${option.value}`
        const selected = selectedValue === option.value
        return (
          <span key={option.value} className="relative">
            {selected ? (
              <motion.span
                layoutId={`segmented-control-${generatedName}`}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className={cn(
                  'absolute inset-0 bg-white/20 dark:bg-white/20',
                  size === 'xs' ? 'rounded-md' : 'rounded-lg',
                )}
                aria-hidden="true"
              />
            ) : null}
            <input
              id={id}
              type="radio"
              name={name ?? generatedName}
              value={option.value}
              checked={selected}
              onChange={handleChange}
              className="peer sr-only"
            />
            <label
              htmlFor={id}
              className={cn(
                'block cursor-pointer transition-colors',
                size === 'xs'
                  ? 'rounded-md px-2 py-1 text-xs'
                  : size === 'lg'
                    ? 'rounded-lg px-4 py-2 text-base'
                    : 'rounded-lg px-3 py-1.5 text-sm',
                selected
                  ? 'relative z-10 text-white'
                  : 'relative z-10 text-white/60 hover:text-white/85',
              )}
            >
              {option.label}
            </label>
          </span>
        )
      })}
    </div>
  )
}
