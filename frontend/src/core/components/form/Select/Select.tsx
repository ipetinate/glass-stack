import { Check, ChevronDown, Search } from 'lucide-react'
import { useId, useState, type ReactNode, type RefObject } from 'react'
import { type Control, type FieldPath, type FieldValues, type RegisterOptions, useController } from 'react-hook-form'
import { cn } from '@/core/functions/class-name'
import { useClickOutside } from '@/core/hooks/useClickOutside'

export type SelectOption = { value: string; label: ReactNode; disabled?: boolean }
export type SelectSection = { label: ReactNode; options: SelectOption[] }
export type SelectProps<TFieldValues extends FieldValues = FieldValues> = { label?: ReactNode; placeholder?: string; helperText?: ReactNode; error?: ReactNode; errorText?: ReactNode; options?: SelectOption[]; sections?: SelectSection[]; value?: string | string[]; defaultValue?: string | string[]; onValueChange?: (value: string | string[]) => void; multiple?: boolean; disabled?: boolean; fullWidth?: boolean; outsideRefs?: RefObject<HTMLElement | null>[]; searchable?: boolean; searchValue?: string; searchPlaceholder?: string; onSearchChange?: (value: string) => void; className?: string; containerClassName?: string; 'aria-label'?: string; control?: Control<TFieldValues>; name?: FieldPath<TFieldValues>; rules?: RegisterOptions<TFieldValues> }

export function Select<TFieldValues extends FieldValues = FieldValues>(props: SelectProps<TFieldValues>) {
  if (props.control && props.name) {
    return <ControlledSelect {...props} />
  }
  const { label, placeholder = 'Selecione', helperText, error, errorText, options = [], sections = [], value, defaultValue, onValueChange, multiple = false, disabled, fullWidth = true, outsideRefs = [], searchable = false, searchValue = '', onSearchChange, className, containerClassName, 'aria-label': ariaLabel } = props
  const id = useId(); const [open, setOpen] = useState(false); const [internal, setInternal] = useState<string | string[]>(defaultValue ?? (multiple ? [] : ''))
  const rootRef = useClickOutside<HTMLDivElement>(() => setOpen(false), { enabled: open, refs: outsideRefs })
  const current = value ?? internal; const selected = Array.isArray(current) ? current : [current]
  const all = sections.flatMap((section) => section.options).concat(options)
  const selectedLabels = all.filter((option) => selected.includes(option.value)).map((option) => option.label)
  function choose(option: SelectOption) { if (option.disabled) return; const next = multiple ? (selected.includes(option.value) ? selected.filter((item) => item !== option.value) : [...selected, option.value]) : option.value; if (value === undefined) setInternal(next); onValueChange?.(next); onSearchChange?.(''); if (!multiple) setOpen(false) }
  return <div ref={rootRef} className={cn('relative space-y-2', fullWidth ? 'w-full' : 'w-fit', containerClassName)}>
    {label ? <label htmlFor={id} className="block text-sm text-[#151A21]/80 dark:text-white/80">{label}</label> : null}
    {searchable ? <div className={cn('relative flex min-h-12 items-center rounded-xl border border-black/10 bg-white/45 text-sm text-[#151A21] outline-none transition focus-within:border-sky-400 dark:border-white/10 dark:bg-black/25 dark:text-white', fullWidth ? 'w-full' : 'w-fit min-w-40', className)}><Search className="pointer-events-none ml-4 size-4 shrink-0 opacity-60" /><input id={id} role="combobox" value={searchValue} placeholder={selectedLabels.length ? String(multiple ? selectedLabels.join(', ') : selectedLabels[0]) : placeholder} aria-label={ariaLabel} disabled={disabled} aria-expanded={open} onFocus={() => { onSearchChange?.(''); setOpen(true) }} onChange={(event) => { onSearchChange?.(event.target.value); setOpen(true) }} className="h-full min-w-0 flex-1 bg-transparent px-3 text-left outline-none placeholder:text-current/40" /><ChevronDown className={cn('mr-4 size-4 shrink-0 opacity-70 transition-transform', open && 'rotate-180')} /></div> : <button id={id} type="button" role="combobox" value={String(Array.isArray(current) ? current.join(',') : current)} aria-label={ariaLabel} disabled={disabled} aria-expanded={open} onClick={() => setOpen((current) => !current)} className={cn('flex min-h-12 items-center justify-between rounded-xl border border-black/10 bg-white/45 px-4 text-left text-sm text-[#151A21] outline-none transition focus:border-sky-400 disabled:cursor-not-allowed disabled:opacity-55 dark:border-white/10 dark:bg-black/25 dark:text-white', fullWidth ? 'w-full' : 'w-fit min-w-40', className)}><span className={cn(selectedLabels.length === 0 && 'text-current/40')}>{selectedLabels.length ? (multiple ? selectedLabels.join(', ') : selectedLabels[0]) : placeholder}</span><ChevronDown className="size-4 opacity-70" /></button>}
    {open ? <div role="listbox" className="absolute z-50 mt-0.5 max-h-64 w-full overflow-auto rounded-xl border border-white/55 bg-white/35 p-2 shadow-xl backdrop-blur-xl backdrop-saturate-150 dark:border-white/10 dark:bg-black/35"><div className="space-y-1">{sections.map((section) => <div key={String(section.label)} className="space-y-1"><p className="px-3 py-2 text-xs font-medium opacity-60">{section.label}</p>{section.options.map((option) => <Option key={option.value} option={option} selected={selected.includes(option.value)} onSelect={choose} />)}</div>)}{options.map((option) => <Option key={option.value} option={option} selected={selected.includes(option.value)} onSelect={choose} />)}</div></div> : null}
    {error ?? errorText ? <p className="text-xs text-rose-500">{error ?? errorText}</p> : helperText ? <p className="text-xs text-black/55 dark:text-white/55">{helperText}</p> : null}
  </div>
}

function ControlledSelect<TFieldValues extends FieldValues>(props: SelectProps<TFieldValues>) {
  const { control, name, rules, ...rest } = props
  const { field, fieldState } = useController({ control, name: name!, rules })
  return <Select {...rest} value={field.value ?? (props.multiple ? [] : '')} error={fieldState.error?.message ?? props.error ?? props.errorText} onValueChange={(next) => { field.onChange(next); props.onValueChange?.(next) }} />
}

function Option({ option, selected, onSelect }: { option: SelectOption; selected: boolean; onSelect: (option: SelectOption) => void }) { return <button type="button" role="option" aria-selected={selected} disabled={option.disabled} onClick={() => onSelect(option)} className={cn('flex min-h-11 w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-black/10 disabled:opacity-40 dark:hover:bg-white/10', selected && 'bg-black/5 dark:bg-white/8')}>{option.label}{selected ? <Check className="size-4 text-cyan-500" /> : null}</button> }
