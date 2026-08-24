import type { ApplicationSummary } from '../types'

export function filterApplications(
  applications: ApplicationSummary[],
  search: string,
  category: string,
  sort: string,
) {
  const normalizedSearch = search.trim().toLocaleLowerCase()
  const filtered = applications.filter((application) => {
    const matchesSearch = normalizedSearch.length === 0 ||
      [application.name, application.developer, application.description]
        .join(' ')
        .toLocaleLowerCase()
        .includes(normalizedSearch)
    const matchesCategory = category === 'all' || application.category === category

    return matchesSearch && matchesCategory
  })

  return [...filtered].sort((left, right) => {
    if (sort === 'name') return left.name.localeCompare(right.name)
    if (sort === 'rating') return right.rating - left.rating
    return 0
  })
}

