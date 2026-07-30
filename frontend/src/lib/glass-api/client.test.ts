import { describe, expect, it, vi } from 'vitest'

describe('glassAPIURL', () => {
  it('uses the browser origin when no API base URL is configured', async () => {
    vi.resetModules()
    vi.stubEnv('VITE_API_BASE_URL', '')
    window.history.replaceState({}, '', '/settings')

    const { glassAPIURL } = await import('./client')

    expect(glassAPIURL('/api/v1/storage').toString()).toBe(
      `${window.location.origin}/api/v1/storage`,
    )
  })

  it('normalizes an explicitly configured API base URL', async () => {
    vi.resetModules()
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080/')

    const { glassAPIURL } = await import('./client')

    expect(glassAPIURL('api/v1/events').toString()).toBe(
      'http://localhost:8080/api/v1/events',
    )
  })
})
