import { useQuery } from '@tanstack/react-query'

import { useDebouncedValue } from '@/core/hooks/useDebouncedValue'

import { searchWeatherLocationQuery } from '../../api'
import { weatherQueryKeys } from '../../weather.constants'

export function useSearchWeatherLocation(search: string) {
  const debouncedSearch = useDebouncedValue(search, 500)
  const normalizedSearch = debouncedSearch.trim()

  return useQuery({
    enabled: normalizedSearch.length >= 3,
    queryKey: weatherQueryKeys.searchLocation(normalizedSearch),
    queryFn: () => searchWeatherLocationQuery(normalizedSearch),
  })
}
