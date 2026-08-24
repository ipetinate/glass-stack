import type { SelectOption } from '@/core/components/form'

import type { AppArchitecture, AppCategory } from './types'

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

export const categoryTagColors: Record<string, string> = {
  Multimedia: '#ff9b9b',
  Video: '#fff09b',
  Library: '#9bffbc',
  Photos: '#9bd8ff',
  Files: '#c4ff9b',
  DNS: '#ffb89b',
}

export const architectureColors: Record<AppArchitecture, string> = {
  'x86-64': '#00b5f0',
  arm64: '#8b87f9',
  riscv64: '#60e5e1',
  mips64: '#4ce699',
}

