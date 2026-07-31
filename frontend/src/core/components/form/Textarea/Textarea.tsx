import { forwardRef, useId, type ReactNode, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/core/functions/class-name'

export type TextareaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'> & {
  label?: ReactNode
  helperText?: ReactNode
  error?: ReactNode
  errorText?: ReactNode
  containerClassName?: string
  prepend?: ReactNode
  append?: ReactNode
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea({ label, helperText, error, errorText, containerClassName, prepend, append, id: providedId, className, ...props }, ref) {
  const id = providedId ?? useId()
  const message = error ?? errorText
  return <label htmlFor={id} className={cn('block w-full space-y-2', containerClassName)}>
    {label ? <span className="block text-sm text-[#151A21]/80 dark:text-white/80">{label}</span> : null}
    <span className="relative flex min-h-28 w-full rounded-xl border border-black/10 bg-white/45 text-[#151A21] focus-within:border-sky-400 dark:border-white/10 dark:bg-black/25 dark:text-white">
      {prepend ? <span className="p-3 text-current/70">{prepend}</span> : null}
      <textarea {...props} ref={ref} id={id} aria-invalid={Boolean(message) || undefined} className={cn('min-h-28 w-full resize-y bg-transparent p-3 text-sm outline-none placeholder:text-[#151A21]/40 dark:placeholder:text-white/35', className)} />
      {append ? <span className="p-3 text-current/70">{append}</span> : null}
    </span>
    {message ? <span className="block text-xs text-rose-600 dark:text-rose-300">{message}</span> : helperText ? <span className="block text-xs text-[#151A21]/55 dark:text-white/55">{helperText}</span> : null}
  </label>
})
