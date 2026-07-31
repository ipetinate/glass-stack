import { cn } from '@/core/functions/class-name'
import { Check } from 'lucide-react'
import { useId, type ComponentPropsWithoutRef, type ReactNode } from 'react'

export type CheckboxProps = Omit<ComponentPropsWithoutRef<'input'>, 'type'> & {
  inputType?: 'checkbox' | 'radio'
  label?: ReactNode
  helperText?: ReactNode
  error?: ReactNode
  errorText?: ReactNode
}

export function Checkbox({
  label,
  helperText,
  error,
  errorText,
  id,
  className,
  inputType = 'checkbox',
  ...props
}: CheckboxProps) {
  const inputId = id ?? useId()
  const message = error ?? errorText

  return (
    <div className={cn('space-y-1', className)}>
      <label
        htmlFor={inputId}
        className="group flex cursor-pointer select-none items-center gap-3 text-sm text-[#151A21]/75 dark:text-white/90"
      >
        <span className="relative grid size-5 place-items-center">
          <input
            {...props}
            id={inputId}
            type={inputType}
            className="peer sr-only"
          />

          <span className="absolute inset-0 rounded-sm border border-black/10 bg-white/45 transition-all group-hover:border-black/20 peer-focus-visible:outline-2 peer-focus-visible:outline-cyan-300/70 peer-checked:border-cyan-300/55 peer-checked:bg-cyan-200/35 dark:border-white/16 dark:bg-white/8 dark:peer-checked:bg-cyan-200/18" />

          <Check
            aria-hidden
            className="relative size-3.5 scale-75 text-[#151A21] opacity-0 transition peer-checked:scale-100 peer-checked:opacity-100 dark:text-white"
          />
        </span>
        {label ? <span>{label}</span> : null}
      </label>

      {message ? (
        <p className="text-xs text-rose-500">{message}</p>
      ) : helperText ? (
        <p className="text-xs text-black/55 dark:text-white/55">{helperText}</p>
      ) : null}
    </div>
  )
}

export function Radio(props: Omit<CheckboxProps, 'type'>) {
  return <Checkbox {...props} inputType="radio" />
}
