import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('trackUnsplashDownloadMutation', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('VITE_UNSPLASH_ACCESS_KEY', 'test-key')
  })

  it('tracks wallpaper selection through the download location', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })

    vi.stubGlobal('fetch', fetchMock)

    const { trackUnsplashDownloadMutation } = await import(
      './track-download.mutation'
    )

    await trackUnsplashDownloadMutation('https://api.unsplash.com/photos/1/download')

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.unsplash.com/photos/1/download',
      {
        headers: { Authorization: 'Client-ID test-key' },
      },
    )
  })
})
