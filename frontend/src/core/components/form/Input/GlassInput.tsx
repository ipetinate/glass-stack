import { Eye, EyeOff } from 'lucide-react'
import {
  forwardRef,
  useId,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react'

import { cn } from '@/core/functions/class-name'

export type GlassInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> & {
  label?: ReactNode
  helperText?: ReactNode
  error?: ReactNode
  containerClassName?: string
}

export const GlassInput = forwardRef<HTMLInputElement, GlassInputProps>(function GlassInput(
  { className, containerClassName, error, helperText, id: providedId, label, type = 'text', ...props },
  ref,
) {
  const generatedId = useId()
  const id = providedId ?? generatedId
  const [visible, setVisible] = useState(false)
  const isPassword = type === 'password'
  const inputType = isPassword && visible ? 'text' : type

  return (
    <label className={cn('block text-sm', containerClassName)} htmlFor={id}>
      {label ? <span className="mb-2 block text-sm text-[#151A21]/80 dark:text-white/80">{label}</span> : null}
      <span className="relative block">
        <input
          {...props}
          ref={ref}
          id={id}
          type={inputType}
          aria-invalid={Boolean(error) || undefined}
          className={cn(
            'h-12 w-full rounded-xl border border-black/10 bg-white/45 px-4 text-sm text-[#151A21] outline-none transition-colors placeholder:text-[#151A21]/40 focus:border-sky-400 focus:ring-1 focus:ring-sky-400/30 dark:border-white/10 dark:bg-black/25 dark:text-white dark:placeholder:text-white/35',
            isPassword && 'pr-12',
            error && 'border-rose-400 focus:border-rose-400 focus:ring-rose-400/30',
            className,
          )}
        />
        {isPassword ? (
          <button
            type="button"
            aria-label={visible ? 'Hide password' : 'Show password'}
            onClick={() => setVisible((current) => !current)}
            className="absolute inset-y-0 right-2 grid w-9 place-items-center rounded-lg text-[#151A21]/55 transition-colors hover:bg-black/5 hover:text-[#151A21] dark:text-white/55 dark:hover:bg-white/10 dark:hover:text-white"
          >
            {visible ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        ) : null}
      </span>
      {error ? <span className="mt-1 block text-xs text-rose-600 dark:text-rose-300">{error}</span> : null}
      {!error && helperText ? <span className="mt-1 block text-xs text-[#151A21]/55 dark:text-white/55">{helperText}</span> : null}
    </label>
  )
})

