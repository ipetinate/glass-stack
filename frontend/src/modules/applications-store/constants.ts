import type { SelectOption } from '@/core/components/form'

import type { AppArchitecture, AppCategory } from './types'

export const applicationCategories: SelectOption[] = [
  { value: 'all', label: 'Todas as categorias' },
  { value: 'Multimedia', label: 'Multimídia' },
  { value: 'Productivity', label: 'Produtividade' },
  { value: 'Networking', label: 'Rede' },
  { value: 'Home', label: 'Casa' },
  { value: 'Security', label: 'Segurança' },
  { value: 'DeveloperTools', label: 'Ferramentas de desenvolvedor' },
  { value: 'Other', label: 'Outros' },
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
  Home: 'Casa',
  Security: 'Segurança',
  DeveloperTools: 'Developer Tools',
  Other: 'Outros',
}

export const categoryTagColors: Record<string, string> = {
  Multimedia: '#ff9b9b',
  Video: '#fff09b',
  Library: '#9bffbc',
  Photos: '#9bd8ff',
  Files: '#c4ff9b',
  DNS: '#ffb89b',
  Home: '#ffd59b',
  Security: '#9bffb4',
  DeveloperTools: '#9bc8ff',
  Other: '#d0d0d0',
}

export const architectureColors: Record<AppArchitecture, string> = {
  'x86-64': '#00b5f0',
  arm64: '#8b87f9',
  riscv64: '#60e5e1',
  mips64: '#4ce699',
}

