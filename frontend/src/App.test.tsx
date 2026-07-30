import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/weather', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/weather')>()

  return {
    ...original,
    Weather: () => <div>Weather</div>,
  }
})

describe('App', () => {
  beforeEach(() => {
    vi.resetModules()
    window.history.pushState({}, '', '/')
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const path = String(input)
        if (path.includes('/api/v1/setup/status')) {
          return Response.json({ required: false })
        }
        if (path.includes('/api/v1/auth/session')) {
          return Response.json({
            user: {
              id: 'user-1',
              username: 'admin',
              role: 'admin',
              status: 'active',
            },
            csrfToken: 'csrf',
            expiresAt: new Date(Date.now() + 60_000).toISOString(),
          })
        }
        if (path.includes('/api/v1/users/me/preferences')) {
          return Response.json({
            userId: 'user-1',
            revision: 1,
            preferences: {
              schemaVersion: 1,
              locale: 'en-US',
              theme: 'dark',
              avatarPresetId: 'default',
              wallpaperId: 'preset-dark',
              windowAppearance: {
                backgroundMode: 'solid',
                actionVisibility: {
                  close: true,
                  maximize: true,
                  verticalExpand: true,
                },
              },
              eventSamplingSeconds: 1,
              dashboard: { version: 1 },
            },
            updatedAt: new Date().toISOString(),
          })
        }
        if (path.includes('/api/v1/storage')) {
          return Response.json({ volumes: [], devices: [] })
        }
        return new Response(null, { status: 404 })
      }),
    )
  })

  it('renders the router inside app providers', async () => {
    const { App } = await import('./App')

    render(<App />)

    expect(await screen.findByText('Storage')).toBeInTheDocument()
  })

  it('initializes from the current browser path', async () => {
    window.history.pushState({}, '', '/settings')
    const { App } = await import('./App')

    render(<App />)

    expect((await screen.findAllByRole('heading', { name: 'Settings' })).length).toBeGreaterThan(
      0,
    )
  })
})
