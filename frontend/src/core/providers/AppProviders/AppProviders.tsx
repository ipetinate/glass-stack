import {
  QueryClient,
  QueryClientProvider,
  type QueryClient as QueryClientInstance,
} from '@tanstack/react-query'
import type { PropsWithChildren } from 'react'
import { useEffect, useState } from 'react'

import { useThemeStore } from '@/core/stores/theme/theme'
import { useWallpaperStore } from '@/core/stores/wallpaper'

type AppProvidersProps = PropsWithChildren<{
  queryClient?: QueryClientInstance
}>

export function AppProviders({ children, queryClient }: AppProvidersProps) {
  const [defaultQueryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            staleTime: 5 * 60 * 1000,
          },
        },
      }),
  )

  const activeQueryClient = queryClient ?? defaultQueryClient
  const theme = useThemeStore((state) => state.theme)

  const syncTheme = useThemeStore((state) => state.syncTheme)
  const applyWallpaper = useWallpaperStore((state) => state.applyWallpaper)

  useEffect(() => {
    if (theme !== 'system') return

    const media = window.matchMedia('(prefers-color-scheme: dark)')

    const handleChange = () => syncTheme()

    media.addEventListener('change', handleChange)

    return () => media.removeEventListener('change', handleChange)
  }, [syncTheme, theme])

  useEffect(() => {
    applyWallpaper()
  }, [applyWallpaper])

  return (
    <QueryClientProvider client={activeQueryClient}>
      {children}
    </QueryClientProvider>
  )
}
