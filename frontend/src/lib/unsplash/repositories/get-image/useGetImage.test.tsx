import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { act } from 'react'
import type { PropsWithChildren } from 'react'
import { describe, expect, it, vi } from 'vitest'

const { glassRequest } = vi.hoisted(() => ({
  glassRequest: vi.fn().mockResolvedValue({
    unsplashConfigured: true,
    unsplashSelfHosted: false,
  }),
}))

vi.mock('@/lib/glass-api', () => ({
  glassRequest,
}))

describe('useGetImage', () => {
  it('does not enable the query before the debounced query has three characters', async () => {
    vi.resetModules()

    const queryClient = new QueryClient()
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
    const { useGetImage } = await import('./useGetImage')

    const { result } = renderHook(() => useGetImage('mo'), {
      wrapper,
    })

    expect(result.current.query.fetchStatus).toBe('idle')
  })

  it('keeps search disabled when the server provider is unavailable', async () => {
    glassRequest.mockResolvedValueOnce({
      unsplashConfigured: false,
      unsplashSelfHosted: false,
    })

    const queryClient = new QueryClient()
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
    const { useGetImage } = await import('./useGetImage')

    const { result } = renderHook(() => useGetImage('mountains'), {
      wrapper,
    })

    await waitFor(() => {
      expect(result.current.isConfigurationLoading).toBe(false)
    })
    expect(result.current.isConfigured).toBe(false)
    expect(result.current.query.fetchStatus).toBe('idle')
  })

  it('waits 1200ms before updating the debounced query', async () => {
    vi.useFakeTimers()
    vi.resetModules()

    const queryClient = new QueryClient()
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
    const { useGetImage } = await import('./useGetImage')

    const { rerender, result } = renderHook(
      ({ query }) => useGetImage(query),
      {
        initialProps: { query: '' },
        wrapper,
      },
    )

    rerender({ query: 'city' })

    act(() => {
      vi.advanceTimersByTime(1199)
    })

    expect(result.current.debouncedQuery).toBe('')

    act(() => {
      vi.advanceTimersByTime(1)
    })

    expect(result.current.debouncedQuery).toBe('city')

    vi.useRealTimers()
  })
})
