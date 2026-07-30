import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('searchUnsplashWallpapersQuery', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('searches wallpapers with required parameters and maps response', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        total_pages: 2,
        results: [
          {
            id: 'photo-1',
            alt_description: 'Snow mountain',
            description: null,
            urls: {
              raw: 'https://images.unsplash.com/photo-1?ixid=abc',
              regular: 'https://images.unsplash.com/regular',
              small: 'https://images.unsplash.com/small',
            },
            links: {
              download_location: 'https://api.unsplash.com/photos/1/download',
            },
            user: {
              name: 'Ada',
              links: {
                html: 'https://unsplash.com/@ada',
              },
            },
          },
        ],
      }),
    })

    vi.stubGlobal('fetch', fetchMock)

    const { searchUnsplashWallpapersQuery } = await import(
      './search-wallpapers.query'
    )

    const result = await searchUnsplashWallpapersQuery({
      query: 'mountains',
    })
    const request = new URL(
      fetchMock.mock.calls[0][0] as string,
      'http://localhost',
    )

    expect(request.searchParams.get('q')).toBe('mountains')
    expect(request.pathname).toBe('/api/v1/wallpapers/search')
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      credentials: 'include',
    })
    expect(result).toMatchObject({
      nextPage: 2,
      page: 1,
      totalPages: 2,
    })
    expect(result.wallpapers[0]).toMatchObject({
      authorName: 'Ada',
      description: 'Snow mountain',
      id: 'photo-1',
      source: 'unsplash',
    })
    expect(result.wallpapers[0].wallpaperUrl).toContain('w=1920')
  })
})
