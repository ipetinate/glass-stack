import {
  type ChangeEventHandler,
  type ComponentPropsWithoutRef,
  type FocusEventHandler,
  forwardRef,
} from 'react'
import {
  type Control,
  type FieldPath,
  type FieldValues,
  type RegisterOptions,
  useController,
} from 'react-hook-form'
import { ChevronDown } from 'lucide-react'

import { cn } from '@/core/functions/class-name'

type NativeSelectProps = Omit<
  ComponentPropsWithoutRef<'select'>,
  'onChange' | 'onBlur' | 'name'
>

export type GlassSelectProps<TFieldValues extends FieldValues = FieldValues> =
  NativeSelectProps & {
    name?: string
    label?: string
    error?: string
    control?: Control<TFieldValues>
    rules?: RegisterOptions<TFieldValues>
    onChange?: ChangeEventHandler<HTMLSelectElement>
    onBlur?: FocusEventHandler<HTMLSelectElement>
  }

export function GlassSelect<TFieldValues extends FieldValues = FieldValues>(
  props: GlassSelectProps<TFieldValues>,
) {
  if (props.control && props.name) {
    return <ControlledGlassSelect {...props} />
  }

  const { control: _control, rules: _rules, ...nativeProps } = props

  return <NativeGlassSelect {...nativeProps} />
}

function ControlledGlassSelect<TFieldValues extends FieldValues>({
  control,
  name,
  rules,
  onChange,
  onBlur,
  ...props
}: GlassSelectProps<TFieldValues>) {
  const { field, fieldState } = useController({
    control: control as Control<TFieldValues>,
    name: name as FieldPath<TFieldValues>,
    rules,
  })

  return (
    <NativeGlassSelect
      {...props}
      name={field.name}
      value={field.value ?? ''}
      ref={field.ref}
      error={fieldState.error?.message ?? props.error}
      onChange={(event) => {
        field.onChange(event)
        onChange?.(event)
      }}
      onBlur={(event) => {
        field.onBlur()
        onBlur?.(event)
      }}
    />
  )
}

type NativeGlassSelectProps = Omit<GlassSelectProps, 'control' | 'rules'>

const NativeGlassSelect = forwardRef<HTMLSelectElement, NativeGlassSelectProps>(
  function NativeGlassSelect(
    {
      className,
      label,
      error,
      id,
      name,
      onChange,
      onBlur,
      ...props
    },
    ref,
  ) {
    return (
      <div className="flex min-w-0 flex-col gap-1.5">
        {label ? (
          <label
            htmlFor={id}
            className="text-xs font-medium text-black/65 dark:text-white/70"
          >
            {label}
          </label>
        ) : null}
        <div className="relative min-w-0">
          <select
            {...props}
            ref={ref}
            id={id}
            name={name}
            onChange={onChange}
            onBlur={onBlur}
            aria-invalid={error ? true : undefined}
            className={cn(
              'w-full appearance-none rounded-lg border border-black/10 bg-white/55 px-3 py-2 pr-11 text-sm text-black/80 outline-none transition-colors focus:border-cyan-400/60 disabled:cursor-not-allowed disabled:opacity-55 dark:border-white/15 dark:bg-white/10 dark:text-white/90',
              error && 'border-rose-400/70 focus:border-rose-400',
              className,
            )}
          />
          <ChevronDown
            aria-hidden="true"
            className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-current opacity-70"
            data-testid="glass-select-chevron"
          />
        </div>
        {error ? (
          <p className="text-xs text-rose-400" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    )
  },
)
