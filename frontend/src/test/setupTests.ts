import '@testing-library/jest-dom/vitest'
import { afterAll, afterEach, beforeAll, vi } from 'vitest'

import { cleanup } from '@testing-library/react'

import { useUnsavedChangesStore } from '@/core/stores/unsaved-changes/unsaved-changes'
import { useWeatherStore } from '@/lib/weather/weather.store'

import { server } from '../../test/mocks/server'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

const mediaQueryListeners = new Set<(event: MediaQueryListEvent) => void>()

Object.defineProperty(window, 'matchMedia', {
  configurable: true,
  writable: true,
  value: vi.fn((query: string) => ({
    matches: true,
    media: query,
    onchange: null,
    addEventListener: vi.fn(
      (_event: string, listener: (event: MediaQueryListEvent) => void) => {
        mediaQueryListeners.add(listener)
      },
    ),
    removeEventListener: vi.fn(
      (_event: string, listener: (event: MediaQueryListEvent) => void) => {
        mediaQueryListeners.delete(listener)
      },
    ),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

afterEach(() => {
  cleanup()
  document.documentElement.className = ''
  localStorage.clear()
  useUnsavedChangesStore.getState().clearUnsavedChanges()
  useWeatherStore.setState({
    mode: 'geolocation',
    selectedLocation: undefined,
    showCondition: true,
    showGreeting: true,
    showIcon: true,
  })
  mediaQueryListeners.clear()
  vi.clearAllMocks()
})
