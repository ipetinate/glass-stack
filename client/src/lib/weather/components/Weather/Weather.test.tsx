import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Weather } from './Weather'
import { formatWeatherTemperature, getWeatherGreeting } from './Weather.functions'
import { useWeatherStore } from '../../weather.store'

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

function mockGeolocationSuccess() {
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: {
      getCurrentPosition: vi.fn((onSuccess: PositionCallback) => {
        onSuccess({
          coords: {
            accuracy: 10,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            latitude: -23.55,
            longitude: -46.63,
            speed: null,
            toJSON: () => ({}),
          },
          timestamp: Date.now(),
          toJSON: () => ({}),
        })
      }),
    },
  })
}

function mockGeolocationError() {
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: {
      getCurrentPosition: vi.fn(
        (_onSuccess: PositionCallback, onError: PositionErrorCallback) => {
          onError({ code: 1, message: 'Denied', PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 })
        },
      ),
    },
  })
}

describe('Weather', () => {
  afterEach(() => {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: undefined,
    })
    vi.unstubAllGlobals()
  })

  it('renders current weather when geolocation and API succeed', async () => {
    mockGeolocationSuccess()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          current: {
            is_day: 1,
            temperature_2m: 22.8,
            weather_code: 0,
          },
          current_units: {
            temperature_2m: '°C',
          },
        }),
      }),
    )

    renderWithQueryClient(<Weather />)

    expect(screen.getByText('Loading weather')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('23º Sunny')).toBeInTheDocument()
    })
  })

  it('renders a blocked state when geolocation fails', async () => {
    mockGeolocationError()

    renderWithQueryClient(<Weather />)

    await waitFor(() => {
      expect(screen.getByText('Weather unavailable')).toBeInTheDocument()
    })
    expect(screen.getByText('Allow location')).toBeInTheDocument()
  })

  it('uses the selected manual location without requesting geolocation', async () => {
    const getCurrentPosition = vi.fn()

    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition,
      },
    })
    useWeatherStore.getState().setManualLocation({
      country: 'Brazil',
      id: 3448439,
      latitude: -23.55,
      longitude: -46.64,
      name: 'São Paulo',
    })
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          current: {
            is_day: 1,
            temperature_2m: 18.4,
            weather_code: 3,
          },
          current_units: {
            temperature_2m: '°C',
          },
        }),
      }),
    )

    renderWithQueryClient(<Weather />)

    await waitFor(() => {
      expect(screen.getByText('18º Cloudy')).toBeInTheDocument()
    })
    expect(getCurrentPosition).not.toHaveBeenCalled()
  })

  it('formats temperature and greetings', () => {
    expect(formatWeatherTemperature(23.4, '°C')).toBe('23º')
    expect(getWeatherGreeting(new Date('2026-07-06T20:00:00'))).toBe(
      'Good evening',
    )
  })
})
