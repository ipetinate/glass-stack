import { ClipboardPasteIcon, Eye, EyeOff } from 'lucide-react'
import {
  forwardRef,
  useId,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react'

import { cn } from '@/core/functions/class-name'

import { InputActionButton } from './InputActionButton'

export type GlassInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'size'
> & {
  label?: ReactNode
  helperText?: ReactNode
  error?: ReactNode
  containerClassName?: string
  allowPaste?: boolean
  onPasteValue?: (value: string) => void
}

export const GlassInput = forwardRef<HTMLInputElement, GlassInputProps>(
  function GlassInput(
    {
      className,
      containerClassName,
      error,
      helperText,
      id: providedId,
      label,
      type = 'text',
      allowPaste = false,
      onPasteValue,
      ...props
    },
    ref,
  ) {
    const generatedId = useId()
    const id = providedId ?? generatedId
    const [visible, setVisible] = useState(false)
    const isPassword = type === 'password'
    const inputType = isPassword && visible ? 'text' : type

    async function pasteToken() {
      try {
        const token = await window.navigator.clipboard.readText()
        onPasteValue?.(token)
      } catch (error) {
        // disparar toast de error informando que nao foi possível copiar
        console.error(error)
      }
    }

    return (
      <label
        className={cn('block space-y-2 w-full', containerClassName)}
        htmlFor={id}
      >
        {label ? (
          <span className="block text-sm text-[#151A21]/80 dark:text-white/80">
            {label}
          </span>
        ) : null}

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
              error &&
                'border-rose-400 focus:border-rose-400 focus:ring-rose-400/30',
              className,
            )}
          />

          {isPassword && (
            <InputActionButton
              action={() => setVisible((current) => !current)}
              ariaLabel={visible ? 'Hide password' : 'Show password'}
              icon={visible ? <EyeOff size={18} /> : <Eye size={18} />}
            />
          )}

          {allowPaste && (
            <InputActionButton
              action={pasteToken}
              ariaLabel="Colar da área de transferência"
              icon={<ClipboardPasteIcon size={18} />}
            />
          )}
        </span>

        {error ? (
          <span className="mt-1 block text-xs text-rose-600 dark:text-rose-300">
            {error}
          </span>
        ) : null}

        {!error && helperText ? (
          <span className="mt-1 block text-xs text-[#151A21]/55 dark:text-white/55">
            {helperText}
          </span>
        ) : null}
      </label>
    )
  },
)
