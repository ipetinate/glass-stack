import { ClipboardPasteIcon, Eye, EyeOff, X } from 'lucide-react'
import {
  forwardRef,
  useId,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react'
import {
  type Control,
  type FieldPath,
  type FieldValues,
  type RegisterOptions,
  useController,
} from 'react-hook-form'

import { cn } from '@/core/functions/class-name'

import { InputActionButton } from './InputActionButton'

export type InputMask = string | ((value: string) => string)

export type InputProps<TFieldValues extends FieldValues = FieldValues> = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'size' | 'value' | 'defaultValue' | 'onChange' | 'name'
> & {
  label?: ReactNode
  helperText?: ReactNode
  error?: ReactNode
  errorText?: ReactNode
  containerClassName?: string
  prepend?: ReactNode
  append?: ReactNode
  clearable?: boolean
  onClear?: () => void
  allowPaste?: boolean
  onPasteValue?: (value: string) => void
  mask?: InputMask
  control?: Control<TFieldValues>
  name?: FieldPath<TFieldValues>
  rules?: RegisterOptions<TFieldValues>
  value?: string
  defaultValue?: string
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void
}

function applyMask(value: string, mask?: InputMask) {
  if (!mask) return value
  if (typeof mask === 'function') return mask(value)
  const tokens = [...value]
  let cursor = 0
  return [...mask].reduce((result, char) => {
    if (char === '0' || char === 'A' || char === '*') {
      const isDigit = char === '0'
      while (cursor < tokens.length && isDigit !== /^\d$/.test(tokens[cursor])) cursor += 1
      const token = tokens[cursor++]
      return result + (token ?? '')
    }
    return result + char
  }, '')
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  props,
  ref,
) {
  const { control, name, rules } = props
  if (control && name) return <ControlledInput {...props} ref={ref} rules={rules} />
  return <UncontrolledInput {...props} ref={ref} />
})

const ControlledInput = forwardRef<HTMLInputElement, InputProps>(function ControlledInput(
  props,
  ref,
) {
  const { control, name, rules, onChange, ...rest } = props
  const { field, fieldState } = useController({ control, name: name!, rules })
  return (
    <UncontrolledInput
      {...rest}
      ref={ref}
      value={field.value ?? ''}
      onChange={(event) => {
        field.onChange(event.target.value)
        onChange?.(event)
      }}
      onBlur={(event) => {
        field.onBlur()
        rest.onBlur?.(event)
      }}
      error={fieldState.error?.message ?? rest.error ?? rest.errorText}
      name={field.name}
    />
  )
})

const UncontrolledInput = forwardRef<HTMLInputElement, InputProps>(function UncontrolledInput(
  {
    className,
    containerClassName,
    error,
    errorText,
    helperText,
    id: providedId,
    label,
    type = 'text',
    prepend,
    append,
    clearable = false,
    onClear,
    mask,
    allowPaste,
    onPasteValue,
    onChange,
    ...props
  },
  ref,
) {
  const generatedId = useId()
  const id = providedId ?? generatedId
  const [visible, setVisible] = useState(false)
  const isPassword = type === 'password'
  const inputType = isPassword && visible ? 'text' : type
  const hasError = Boolean(error ?? errorText)

  async function pasteValue() {
    try {
      const value = await window.navigator.clipboard.readText()
      onPasteValue?.(value)
    } catch {
      // Clipboard permission failures are intentionally silent.
    }
  }

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    if (mask) {
      const masked = applyMask(event.target.value, mask)
      if (masked !== event.target.value) {
        event.target.value = masked
      }
    }
    onChange?.(event)
  }

  const actions = [
    append ? <span key="append">{append}</span> : null,
    clearable && props.value ? (
      <InputActionButton key="clear" action={() => onClear?.()} ariaLabel="Limpar" icon={<X size={17} />} />
    ) : null,
    isPassword ? (
      <InputActionButton key="password" action={() => setVisible((current) => !current)} ariaLabel={visible ? 'Ocultar senha' : 'Mostrar senha'} icon={visible ? <EyeOff size={18} /> : <Eye size={18} />} />
    ) : null,
    allowPaste ? (
      <InputActionButton key="paste" action={pasteValue} ariaLabel="Colar da área de transferência" icon={<ClipboardPasteIcon size={18} />} />
    ) : null,
  ].filter(Boolean)

  return (
    <label className={cn('block w-full space-y-2', containerClassName)} htmlFor={id}>
      {label ? <span className="block text-sm text-[#151A21]/80 dark:text-white/80">{label}</span> : null}
      <span className="relative flex h-12 w-full items-center overflow-hidden rounded-xl border border-black/10 bg-white/45 text-[#151A21] transition-colors focus-within:border-sky-400 focus-within:ring-1 focus-within:ring-sky-400/30 dark:border-white/10 dark:bg-black/25 dark:text-white">
        {prepend ? <span className="ml-3 shrink-0 text-current/70">{prepend}</span> : null}
        <input
          {...props}
          ref={ref}
          id={id}
          type={inputType}
          onChange={handleChange}
          aria-invalid={hasError || undefined}
          className={cn('h-full min-w-0 flex-1 bg-transparent px-4 text-sm outline-none placeholder:text-[#151A21]/40 dark:placeholder:text-white/35', prepend && 'pl-2', actions.length > 0 && 'pr-2', hasError && 'text-rose-900 dark:text-rose-100', className)}
        />
        {actions.length > 0 ? <span className="flex shrink-0 items-center gap-1 pr-2">{actions}</span> : null}
      </span>
      {hasError ? <span className="block text-xs text-rose-600 dark:text-rose-300">{error ?? errorText}</span> : helperText ? <span className="block text-xs text-[#151A21]/55 dark:text-white/55">{helperText}</span> : null}
    </label>
  )
})
