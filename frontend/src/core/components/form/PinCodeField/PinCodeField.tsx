import { useRef } from 'react'
import { Minus } from 'lucide-react'

import { cn } from '@/core/functions/class-name'

export type PinCodeFieldProps = {
  fields: number
  value: string
  onChange: (value: string) => void
  groups?: number
  separator?: boolean
  label?: string
  className?: string
  disabled?: boolean
}

export function PinCodeField({
  fields,
  value,
  onChange,
  groups = 1,
  separator = false,
  label,
  className,
  disabled = false,
}: PinCodeFieldProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([])
  const count = Math.max(1, Math.floor(fields))
  const groupCount = Math.min(count, Math.max(1, Math.floor(groups)))
  const groupSize = Math.ceil(count / groupCount)
  const digits = Array.from({ length: count }, (_, index) => value[index] ?? '')

  const update = (index: number, next: string) => {
    const nextDigits = [...digits]
    nextDigits[index] = next.slice(-1)
    onChange(nextDigits.join(''))
  }

  const distribute = (startIndex: number, text: string) => {
    const pasted = text.replace(/\D/g, '').slice(0, count - startIndex)
    if (!pasted) return
    const nextDigits = [...digits]
    pasted.split('').forEach((digit, offset) => {
      nextDigits[startIndex + offset] = digit
    })
    onChange(nextDigits.join(''))
    refs.current[Math.min(startIndex + pasted.length, count - 1)]?.focus()
  }

  return (
    <div className={cn('space-y-2', className)}>
      {label ? <span className="block text-sm text-[#151A21]/80 dark:text-white/80">{label}</span> : null}
      <div className="flex items-center justify-start gap-2" role="group" aria-label={label}>
        {digits.map((digit, index) => {
          const isGroupEnd = (index + 1) % groupSize === 0 && index < count - 1
          return (
            <span key={index} className={cn('flex items-center gap-2', isGroupEnd && 'mr-2')}>
              <input
                ref={(element) => { refs.current[index] = element }}
                aria-label={`${label ?? 'Código'} dígito ${index + 1}`}
                autoComplete={index === 0 ? 'one-time-code' : 'off'}
                className="size-12 rounded-xl border border-black/10 bg-white/45 text-center text-lg text-[#151A21] outline-none transition focus:border-sky-400 focus:ring-1 focus:ring-sky-400/30 dark:border-white/10 dark:bg-black/25 dark:text-white"
                disabled={disabled}
                inputMode="numeric"
                maxLength={1}
                type="text"
                value={digit}
                onChange={(event) => {
                  const next = event.target.value.replace(/\D/g, '')
                  update(index, next)
                  if (next && index < count - 1) refs.current[index + 1]?.focus()
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Backspace' && !digits[index] && index > 0) {
                    refs.current[index - 1]?.focus()
                  }
                  if (event.key === 'ArrowLeft' && index > 0) refs.current[index - 1]?.focus()
                  if (event.key === 'ArrowRight' && index < count - 1) refs.current[index + 1]?.focus()
                }}
                onPaste={(event) => {
                  event.preventDefault()
                  distribute(index, event.clipboardData.getData('text'))
                }}
              />
              {isGroupEnd && separator ? <Minus aria-hidden="true" className="size-4 shrink-0 text-current/60" strokeWidth={2.5} /> : null}
            </span>
          )
        })}
      </div>
    </div>
  )
}
