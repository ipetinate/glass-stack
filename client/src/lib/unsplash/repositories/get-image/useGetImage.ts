import { useInfiniteQuery } from '@tanstack/react-query'

import { useDebouncedValue } from '@/core/hooks/useDebouncedValue'

import { searchUnsplashWallpapersQuery } from '../../api'
import { unsplashConfig } from '../../unsplash.config'

export function useGetImage(query: string) {
  const debouncedQuery = useDebouncedValue(query.trim(), 1200)
  const canSearch = Boolean(unsplashConfig.accessKey) && debouncedQuery.length >= 3

  return {
    debouncedQuery,
    isConfigured: Boolean(unsplashConfig.accessKey),
    query: useInfiniteQuery({
      enabled: canSearch,
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
