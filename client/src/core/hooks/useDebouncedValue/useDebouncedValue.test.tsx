import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useDebouncedValue } from './useDebouncedValue'

describe('useDebouncedValue', () => {
  it('updates the value after the configured delay', () => {
    vi.useFakeTimers()

    const { rerender, result } = renderHook(
      ({ value }) => useDebouncedValue(value, 600),
      { initialProps: { value: 'mo' } },
    )

    rerender({ value: 'mountains' })

    expect(result.current).toBe('mo')

    act(() => vi.advanceTimersByTime(599))
    expect(result.current).toBe('mo')

    act(() => vi.advanceTimersByTime(1))
    expect(result.current).toBe('mountains')

    vi.useRealTimers()
  })
})
