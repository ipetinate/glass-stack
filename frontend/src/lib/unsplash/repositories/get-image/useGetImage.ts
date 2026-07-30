import { useInfiniteQuery, useQuery } from '@tanstack/react-query'

import { useDebouncedValue } from '@/core/hooks/useDebouncedValue'
import { glassRequest } from '@/lib/glass-api'

import { searchUnsplashWallpapersQuery } from '../../api'

export function useGetImage(query: string) {
  const debouncedQuery = useDebouncedValue(query.trim(), 1200)
  const canSearch = debouncedQuery.length >= 3
  const capabilities = useQuery({
    queryKey: ['wallpapers', 'capabilities'],
    queryFn: () =>
      glassRequest<{
        unsplashConfigured: boolean
        unsplashSelfHosted: boolean
      }>('/api/v1/wallpapers/capabilities'),
    staleTime: 60_000,
  })
  const isConfigured = capabilities.data?.unsplashConfigured === true

  return {
    debouncedQuery,
    isConfigurationLoading: capabilities.isPending,
    isConfigured,
    query: useInfiniteQuery({
      enabled: canSearch && isConfigured,
      initialPageParam: 1,
      queryKey: ['unsplash-wallpapers', debouncedQuery],
      queryFn: ({ pageParam }) =>
        searchUnsplashWallpapersQuery({
          page: pageParam,
          query: debouncedQuery,
        }),
      getNextPageParam: (lastPage) => lastPage.nextPage,
    }),
  }
}
