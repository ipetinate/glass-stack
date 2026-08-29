import { QueryClient } from '@tanstack/react-query'
import { screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { customRender } from '@/test/test-utils'

import { server } from '../../../../test/mocks/server'

import { InstalledApps } from './InstalledApps'

function renderWidget() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Number.POSITIVE_INFINITY,
      },
    },
  })
  return customRender(<InstalledApps />, { queryClient })
}

describe('InstalledApps', () => {
  it('lists installed applications with their titles', async () => {
    renderWidget()

    expect(await screen.findByText('Jellyfin')).toBeInTheDocument()
    expect(screen.getByText('Installing…')).toBeInTheDocument()
  })

  it('shows "Installing…" and a spinner overlay while an app installs', async () => {
    const { container } = renderWidget()

    await screen.findByText('Installing…')
    expect(container.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('links installed apps to their access URL', async () => {
    renderWidget()

    const link = await screen.findByRole('link', { name: /Jellyfin/ })
    expect(link).toHaveAttribute('href', 'http://localhost:8096/')
  })

  it('shows an empty state when no apps are installed', async () => {
    server.use(
      http.get('/api/v1/apps', () => HttpResponse.json({ data: [] })),
    )
    renderWidget()

    await waitFor(() => {
      expect(screen.getByText(/No apps installed yet/)).toBeInTheDocument()
    })
  })
})