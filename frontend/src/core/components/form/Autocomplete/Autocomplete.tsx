import { Autocomplete as BaseAutocomplete } from '@base-ui/react/autocomplete'
import { ChevronDown, Search } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'

import { cn } from '@/core/functions/class-name'

import type { SelectOption, SelectSection, SelectProps } from '../Select/Select'

export type AutocompleteProps = SelectProps & {
  searchPlaceholder?: string
  filter?: (option: SelectOption, query: string) => boolean
}

export function Autocomplete({
  searchPlaceholder = 'Buscar...',
  filter,
  options = [],
  sections = [],
  label,
  helperText,
  error,
  errorText,
  placeholder = 'Selecione',
  value,
  onValueChange,
  disabled,
  fullWidth = true,
  containerClassName,
  className,
  'aria-label': ariaLabel,
}: AutocompleteProps) {
  const [query, setQuery] = useState('')
  const selectedValue = Array.isArray(value) ? value[0] : value
  const allSections = sections.flatMap((section) => section.options)
  const allOptions = [...allSections, ...options]
  const selected = allOptions.find((option) => option.value === selectedValue)
  const matcher = (option: SelectOption) =>
    filter
      ? filter(option, query)
      : String(option.label).toLowerCase().includes(query.toLowerCase())
  const filteredOptions = useMemo(() => options.filter(matcher), [options, query])
  const filteredSections = useMemo<SelectSection[]>(
    () => sections
      .map((section) => ({ ...section, options: section.options.filter(matcher) }))
      .filter((section) => section.options.length > 0),
    [sections, query],
  )
  const items = [...filteredSections.flatMap((section) => section.options), ...filteredOptions]
  const id = `autocomplete-${label ? String(label).replace(/\s+/g, '-').toLowerCase() : 'field'}`

  function selectOption(option: SelectOption) {
    setQuery(option.label ? String(option.label) : '')
    onValueChange?.(option.value)
  }

  return (
    <div className={cn('relative space-y-2', fullWidth ? 'w-full' : 'w-fit', containerClassName)}>
      {label ? <label htmlFor={id} className="block text-sm text-[#151A21]/80 dark:text-white/80">{label}</label> : null}
      <BaseAutocomplete.Root
        items={items}
        mode="list"
        autoHighlight
        openOnInputClick
        value={query}
        onValueChange={setQuery}
        itemToStringValue={(item) => String((item as SelectOption)?.label ?? '')}
      >
        <div className={cn('relative flex min-h-12 items-center rounded-xl border border-black/10 bg-white/45 text-sm text-[#151A21] transition focus-within:border-sky-400 dark:border-white/10 dark:bg-black/25 dark:text-white', fullWidth ? 'w-full' : 'w-fit min-w-40', className)}>
          <Search className="pointer-events-none ml-4 size-4 shrink-0 opacity-60" />
          <BaseAutocomplete.Input
            id={id}
            aria-label={ariaLabel}
            placeholder={query ? '' : (selected ? String(selected.label) : searchPlaceholder || placeholder)}
            disabled={disabled}
            className="h-full min-w-0 flex-1 bg-transparent px-3 outline-none placeholder:text-current/40"
          />
          <ChevronDown className="mr-4 size-4 shrink-0 opacity-70" />
        </div>
        <BaseAutocomplete.Portal>
          <BaseAutocomplete.Positioner sideOffset={2} className="z-50 w-[var(--anchor-width)] max-w-[calc(100vw-2rem)]">
            <BaseAutocomplete.Popup className="max-h-64 w-full overflow-auto rounded-xl border border-white/55 bg-white/35 p-2 shadow-xl backdrop-blur-xl backdrop-saturate-150 dark:border-white/10 dark:bg-black/35">
              <BaseAutocomplete.Empty className="px-3 py-2 text-sm opacity-65">Nenhum resultado encontrado.</BaseAutocomplete.Empty>
              <BaseAutocomplete.List className="space-y-1">
                {filteredSections.map((section) => <BaseAutocomplete.Group key={String(section.label)} className="space-y-1"><BaseAutocomplete.GroupLabel className="px-3 py-2 text-xs font-medium opacity-60">{section.label}</BaseAutocomplete.GroupLabel>{section.options.map((option) => <BaseAutocomplete.Item key={option.value} value={option} onClick={() => selectOption(option)} className="flex min-h-11 w-full items-center rounded-lg px-3 py-2.5 text-left text-sm outline-none transition-colors hover:bg-black/10 data-[highlighted]:bg-black/10 dark:hover:bg-white/10 dark:data-[highlighted]:bg-white/10">{option.label}</BaseAutocomplete.Item>)}</BaseAutocomplete.Group>)}
                {filteredOptions.map((option) => <BaseAutocomplete.Item key={option.value} value={option} onClick={() => selectOption(option)} className="flex min-h-11 w-full items-center rounded-lg px-3 py-2.5 text-left text-sm outline-none transition-colors hover:bg-black/10 data-[highlighted]:bg-black/10 dark:hover:bg-white/10 dark:data-[highlighted]:bg-white/10">{option.label}</BaseAutocomplete.Item>)}
              </BaseAutocomplete.List>
            </BaseAutocomplete.Popup>
          </BaseAutocomplete.Positioner>
        </BaseAutocomplete.Portal>
      </BaseAutocomplete.Root>
      {error ?? errorText ? <p className="text-xs text-rose-500">{error ?? errorText}</p> : helperText ? <p className="text-xs text-black/55 dark:text-white/55">{helperText}</p> : null}
    </div>
  )
}

export type AutocompleteItem = SelectOption
export type AutocompleteLabel = ReactNode
