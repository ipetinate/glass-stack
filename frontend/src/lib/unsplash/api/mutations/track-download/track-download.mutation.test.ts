import { describe, expect, it, vi } from 'vitest'

describe('trackUnsplashDownloadMutation', () => {
  it('leaves provider tracking to the backend', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })

    vi.stubGlobal('fetch', fetchMock)

    const { trackUnsplashDownloadMutation } = await import(
      './track-download.mutation'
    )

    await trackUnsplashDownloadMutation('https://api.unsplash.com/photos/1/download')

    expect(fetchMock).not.toHaveBeenCalled()
  })
})
