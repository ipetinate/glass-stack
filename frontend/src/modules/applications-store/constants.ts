import type { SelectOption } from '@/core/components/form'

import type { AppCategory } from './types'

export const applicationCategories: SelectOption[] = [
  { value: 'all', label: 'Todas as categorias' },
  { value: 'Multimedia', label: 'Multimídia' },
  { value: 'Productivity', label: 'Produtividade' },
  { value: 'Networking', label: 'Rede' },
]

export const applicationSortOptions: SelectOption[] = [
  { value: 'recent', label: 'Mais recentes' },
  { value: 'rating', label: 'Melhor avaliados' },
  { value: 'name', label: 'Nome' },
]

export const categoryLabels: Record<AppCategory, string> = {
  Multimedia: 'Multimídia',
  Productivity: 'Produtividade',
  Networking: 'Rede',
}

