import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { PropsWithChildren } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { useWallpaperStore } from '@/core/stores/wallpaper'

import { WallpaperSelector } from './WallpaperSelector'

vi.mock('@/lib/unsplash', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/unsplash')>()

  return {
    ...original,
    trackUnsplashDownload: vi.fn(),
    useUnsplashWallpapers: () => ({
      debouncedQuery: 'glass',
      isConfigured: true,
      query: {
        data: {
          pages: [
            {
              nextPage: undefined,
              page: 1,
              totalPages: 1,
              wallpapers: [
                {
                  id: 'unsplash-1',
                  authorName: 'Ada',
                  authorUrl: 'https://unsplash.com/@ada',
                  description: 'Glass mountain',
                  downloadLocation: 'https://api.unsplash.com/photos/1/download',
                  previewUrl: 'https://images.unsplash.com/preview',
                  source: 'unsplash',
                  wallpaperUrl: 'https://images.unsplash.com/wallpaper',
                },
              ],
            },
          ],
        },
        fetchNextPage: vi.fn(),
        hasNextPage: false,
        isError: false,
        isFetching: false,
        isFetchingNextPage: false,
      },
    }),
  }
})

const renderWithQueryClient = (children: React.ReactNode) => {
  const queryClient = new QueryClient()
  const wrapper = ({ children: wrapperChildren }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>
      {wrapperChildren}
    </QueryClientProvider>
  )

  return render(children, { wrapper })
}

describe('WallpaperSelector', () => {
  it('renders presets, coming soon upload, and unsplash search', () => {
    renderWithQueryClient(<WallpaperSelector />)

    expect(
      screen.getByRole('button', { name: 'Select Night Alps' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Select Computer' })).toBeDisabled()
    expect(screen.getByLabelText('Search Unsplash')).toBeInTheDocument()
    expect(screen.getByLabelText('Selected wallpaper preview')).toHaveClass(
      'aspect-video',
    )
  })

  it('selects a preset wallpaper', async () => {
    const user = userEvent.setup()

    renderWithQueryClient(<WallpaperSelector />)

    await user.click(screen.getByRole('button', { name: 'Select Cloud' }))

    expect(useWallpaperStore.getState().selectedWallpaper.id).toBe(
      'solid-cloud',
    )
  })

  it('shows unsplash credits when an unsplash wallpaper is selected', async () => {
    const user = userEvent.setup()

    renderWithQueryClient(<WallpaperSelector />)

    await user.click(screen.getByRole('button', { name: 'Select Glass mountain' }))

    expect(screen.getByText('Ada on Unsplash')).toBeInTheDocument()
    expect(screen.getByText('Optimized to 1920px')).toBeInTheDocument()
  })
})
