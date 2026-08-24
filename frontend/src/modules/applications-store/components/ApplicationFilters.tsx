import { Filter, ListFilter } from 'lucide-react'

import { Select } from '@/core/components/form'
import { Button } from '@/core/components/ui/Button'

import { applicationCategories, applicationSortOptions } from '../constants'

type ApplicationFiltersProps = {
  category: string
  sort: string
  expanded: boolean
  onCategoryChange: (value: string) => void
  onSortChange: (value: string) => void
  onToggle: () => void
}

export function ApplicationFilters({
  category,
  sort,
  expanded,
  onCategoryChange,
  onSortChange,
  onToggle,
}: ApplicationFiltersProps) {
  return (
    <div className="relative shrink-0">
      <Button
        type="button"
        size="sm"
        aria-expanded={expanded}
        onClick={onToggle}
        className="min-h-9 rounded-lg border-white/10 bg-black/20 text-white/80 hover:bg-black/35"
      >
        <Filter className="size-4" />
        Filtros
        <ListFilter className="size-4 opacity-60" />
      </Button>
      {expanded ? (
        <div className="absolute right-0 top-11 z-20 grid w-72 gap-3 rounded-xl border border-white/10 bg-[#151a21]/95 p-4 shadow-xl backdrop-blur-xl">
          <Select
            aria-label="Categoria"
            value={category}
            options={applicationCategories}
            onValueChange={(value) => onCategoryChange(String(value))}
          />
          <Select
            aria-label="Ordenar aplicativos"
            value={sort}
            options={applicationSortOptions}
            onValueChange={(value) => onSortChange(String(value))}
          />
        </div>
      ) : null}
    </div>
  )
}

