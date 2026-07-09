import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { PropsWithChildren } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useWeatherStore } from '@/lib/weather'

import { WeatherDropdownContent } from './WeatherDropdownContent'

const renderWithQueryClient = (children: React.ReactNode) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
  const wrapper = ({ children: wrapperChildren }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{wrapperChildren}</QueryClientProvider>
  )

  return render(children, { wrapper })
}

describe('WeatherDropdownContent', () => {
  beforeEach(() => {
    vi.useRealTimers()
  })

  it('searches and selects manual locations', async () => {
    const user = userEvent.setup()

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [
            {
              admin1: 'São Paulo',
              country: 'Brazil',
              id: 3448439,
              latitude: -23.55,
              longitude: -46.64,
              name: 'São Paulo',
              timezone: 'America/Sao_Paulo',
            },
          ],
        }),
      }),
    )

    renderWithQueryClient(<WeatherDropdownContent />)

    await user.type(
      screen.getByLabelText('Search city, ZIP or postal code'),
      'Sao Paulo',
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /São Paulo/ })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /São Paulo/ }))

    expect(useWeatherStore.getState()).toMatchObject({
      mode: 'manual',
      selectedLocation: expect.objectContaining({
        country: 'Brazil',
        name: 'São Paulo',
      }),
    })
  })

  it('returns to browser geolocation and updates display toggles', async () => {
    const user = userEvent.setup()

    useWeatherStore.getState().setManualLocation({
      country: 'Brazil',
      id: 3448439,
      latitude: -23.55,
      longitude: -46.64,
      name: 'São Paulo',
    })

    renderWithQueryClient(<WeatherDropdownContent />)

    expect(screen.getByText('São Paulo, Brazil')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Use my location' }))
    await user.click(screen.getByLabelText('Show condition'))

    expect(useWeatherStore.getState()).toMatchObject({
      mode: 'geolocation',
      selectedLocation: undefined,
      showCondition: false,
    })
  })

  it('uses advanced search fields to submit a combined search', async () => {
    const user = userEvent.setup()

    renderWithQueryClient(<WeatherDropdownContent />)

    await user.click(screen.getByRole('button', { name: 'Advanced search' }))
    await user.type(screen.getByPlaceholderText('Country'), 'Brazil')
    await user.type(screen.getByPlaceholderText('State'), 'Rio de Janeiro')
    await user.type(screen.getByPlaceholderText('City'), 'Niteroi')
    await user.click(screen.getByRole('button', { name: 'Search' }))

    expect(screen.getByLabelText('Search city, ZIP or postal code')).toHaveValue(
      'Niteroi, Rio de Janeiro, Brazil',
    )
  })
})
