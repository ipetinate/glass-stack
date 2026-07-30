import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { defaultWallpaper } from '@/core/stores/wallpaper'
import { useWallpaperSearchStore } from '@/core/stores/wallpaper-search'

import { UnsplashWallpaperSearch } from './UnsplashWallpaperSearch'

type UnsplashMockState = {
  debouncedQuery: string
  isConfigurationLoading: boolean
  isConfigured: boolean
  query: {
    data?:
      | {
          pages: Array<{
            nextPage?: number
            page: number
            totalPages: number
            wallpapers: Array<{
              id: string
              authorName: string
              authorUrl: string
              description: string
              downloadLocation: string
              previewUrl: string
              source: 'unsplash'
              wallpaperUrl: string
            }>
          }>
        }
      | undefined
    fetchNextPage: ReturnType<typeof vi.fn>
    hasNextPage: boolean
    isError: boolean
    isFetching: boolean
    isFetchingNextPage: boolean
  }
}

let unsplashMockState: UnsplashMockState = {
  debouncedQuery: '',
  isConfigurationLoading: false,
  isConfigured: true,
  query: {
    data: undefined,
    fetchNextPage: vi.fn(),
    hasNextPage: false,
    isError: false,
    isFetching: false,
    isFetchingNextPage: false,
  },
}

vi.mock('@/lib/unsplash', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/unsplash')>()

  return {
    ...original,
    useUnsplashWallpapers: () => unsplashMockState,
  }
})

describe('UnsplashWallpaperSearch', () => {
  beforeEach(() => {
    unsplashMockState = {
      debouncedQuery: '',
      isConfigurationLoading: false,
      isConfigured: true,
      query: {
        data: undefined,
        fetchNextPage: vi.fn(),
        hasNextPage: false,
        isError: false,
        isFetching: false,
        isFetchingNextPage: false,
      },
    }
    useWallpaperSearchStore.setState({ search: '' })
  })

  it('renders wallpaper search ideas in the empty state', async () => {
    const user = userEvent.setup()

    render(
      <UnsplashWallpaperSearch
        selectedWallpaper={defaultWallpaper}
        onPreview={vi.fn()}
        onSelect={vi.fn()}
      />,
    )

    expect(screen.getByText(/glass room to breathe/i)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'misty mountains' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Developer suggestions')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Select a blue jellyfish in the dark/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Select close view of busy city/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', {
        name: /Select northern lights over snow-capped mountain/i,
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Select group of blue jellyfish/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', {
        name: /Select a white sports car parked on a wet road/i,
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', {
        name: /Select a yellow car parked next to a blue car/i,
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', {
        name: /Select a red car parked in front of a concrete wall/i,
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Select gray Land Range Rover vehicle/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Select white car crossing body of water/i }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'misty mountains' }))

    expect(screen.getByLabelText('Search Unsplash')).toHaveValue(
      'misty mountains',
    )
  })

  it('explains the server configuration when Unsplash is unavailable', () => {
    unsplashMockState = {
      ...unsplashMockState,
      isConfigured: false,
    }

    render(
      <UnsplashWallpaperSearch
        selectedWallpaper={defaultWallpaper}
        onPreview={vi.fn()}
        onSelect={vi.fn()}
      />,
    )

    expect(
      screen.getByText(/GLASS_UNSPLASH_ACCESS_KEY/i),
    ).toBeInTheDocument()
    expect(screen.queryByText('Developer suggestions')).not.toBeInTheDocument()
  })

  it('selects developer suggested wallpapers', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()

    render(
      <UnsplashWallpaperSearch
        selectedWallpaper={defaultWallpaper}
        onPreview={vi.fn()}
        onSelect={onSelect}
      />,
    )

    await user.click(
      screen.getByRole('button', { name: /Select a blue jellyfish in the dark/i }),
    )

    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        id: '3kzmA3438Ao',
        authorName: 'Pawel Czerwinski',
      }),
    )
  })

  it('renders a stable two-row skeleton while searching', () => {
    unsplashMockState = {
      debouncedQuery: 'city',
      isConfigurationLoading: false,
      isConfigured: true,
      query: {
        data: undefined,
        fetchNextPage: vi.fn(),
        hasNextPage: false,
        isError: false,
        isFetching: true,
        isFetchingNextPage: false,
      },
    }

    render(
      <UnsplashWallpaperSearch
        selectedWallpaper={defaultWallpaper}
        onPreview={vi.fn()}
        onSelect={vi.fn()}
      />,
    )

    expect(screen.getByRole('status', { name: 'Searching wallpapers' })).toHaveClass(
      'min-h-[35rem]',
    )
    expect(screen.getAllByTestId('wallpaper-skeleton-card')).toHaveLength(10)
  })

  it('keeps the skeleton visible while waiting for debounce', async () => {
    const user = userEvent.setup()

    render(
      <UnsplashWallpaperSearch
        selectedWallpaper={defaultWallpaper}
        onPreview={vi.fn()}
        onSelect={vi.fn()}
      />,
    )

    await user.type(screen.getByLabelText('Search Unsplash'), 'city')

    expect(screen.getByRole('status', { name: 'Searching wallpapers' })).toBeInTheDocument()
  })

  it('keeps search text after remounting', async () => {
    const user = userEvent.setup()
    const { unmount } = render(
      <UnsplashWallpaperSearch
        selectedWallpaper={defaultWallpaper}
        onPreview={vi.fn()}
        onSelect={vi.fn()}
      />,
    )

    await user.type(screen.getByLabelText('Search Unsplash'), 'aurora')
    unmount()

    render(
      <UnsplashWallpaperSearch
        selectedWallpaper={defaultWallpaper}
        onPreview={vi.fn()}
        onSelect={vi.fn()}
      />,
    )

    expect(screen.getByLabelText('Search Unsplash')).toHaveValue('aurora')
  })

  it('loads the next page when Load more is clicked', async () => {
    const user = userEvent.setup()
    const fetchNextPage = vi.fn()

    unsplashMockState = {
      debouncedQuery: 'glass',
      isConfigurationLoading: false,
      isConfigured: true,
      query: {
        data: {
          pages: [
            {
              nextPage: 2,
              page: 1,
              totalPages: 2,
              wallpapers: [
                {
                  id: 'wallpaper-1',
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
        fetchNextPage,
        hasNextPage: true,
        isError: false,
        isFetching: false,
        isFetchingNextPage: false,
      },
    }

    render(
      <UnsplashWallpaperSearch
        selectedWallpaper={defaultWallpaper}
        onPreview={vi.fn()}
        onSelect={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Load more' }))

    expect(fetchNextPage).toHaveBeenCalled()
  })
})
