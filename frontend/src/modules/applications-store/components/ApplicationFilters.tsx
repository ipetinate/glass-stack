import { Filter } from 'lucide-react'

import { Select } from '@/core/components/form'

import { applicationCategories, applicationSortOptions } from '../constants'

type ApplicationFiltersProps = {
  category: string
  sort: string
  expanded: boolean
  onCategoryChange: (value: string) => void
  onSortChange: (value: string) => void
}

export function ApplicationFilters({
  category,
  sort,
  expanded,
  onCategoryChange,
  onSortChange,
}: ApplicationFiltersProps) {
  if (!expanded) return null

  return (
    <div className="absolute right-0 top-full z-20 mt-2 grid w-72 gap-3 rounded-xl border border-white/10 bg-[#151a21]/95 p-4 shadow-xl backdrop-blur-xl">
      <Select
        aria-label="Category"
        value={category}
        options={applicationCategories}
        onValueChange={(value) => onCategoryChange(String(value))}
      />
      <Select
        aria-label="Sort apps"
        value={sort}
        options={applicationSortOptions}
        onValueChange={(value) => onSortChange(String(value))}
      />
    </div>
  )
}

export function FilterTrigger({ onClick, expanded }: { onClick: () => void; expanded: boolean }) {
  return (
    <button
      type="button"
      aria-expanded={expanded}
      aria-label="Filters"
      onClick={onClick}
      className="flex size-8 items-center justify-center rounded-lg text-white/60 transition-colors hover:bg-white/10 hover:text-white"
    >
      <Filter className="size-4" />
    </button>
  )
}

