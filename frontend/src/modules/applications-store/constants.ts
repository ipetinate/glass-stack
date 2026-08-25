import type { SelectOption } from '@/core/components/form'

import type { AppArchitecture, AppCategory } from './types'

export const applicationCategories: SelectOption[] = [
  { value: 'all', label: 'All categories' },
  { value: 'Multimedia', label: 'Multimedia' },
  { value: 'Productivity', label: 'Productivity' },
  { value: 'Networking', label: 'Networking' },
  { value: 'Home', label: 'Home' },
  { value: 'Security', label: 'Security' },
  { value: 'DeveloperTools', label: 'Developer Tools' },
  { value: 'Other', label: 'Other' },
]

export const applicationSortOptions: SelectOption[] = [
  { value: 'recent', label: 'Most recent' },
  { value: 'rating', label: 'Highest rated' },
  { value: 'name', label: 'Name' },
]

export const categoryLabels: Record<AppCategory, string> = {
  Multimedia: 'Multimedia',
  Productivity: 'Productivity',
  Networking: 'Networking',
  Home: 'Home',
  Security: 'Security',
  DeveloperTools: 'Developer Tools',
  Other: 'Other',
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

