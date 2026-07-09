import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { useThemeStore } from '@/core/stores/theme/theme'

import { useTheme } from './useTheme'

describe('useTheme', () => {
  it('returns theme state and actions from the store', () => {
    useThemeStore.setState({ theme: 'light', resolvedTheme: 'light' })

    const { result } = renderHook(() => useTheme())

    expect(result.current.theme).toBe('light')
    expect(result.current.resolvedTheme).toBe('light')
    expect(result.current.setTheme).toBe(useThemeStore.getState().setTheme)
    expect(result.current.syncTheme).toBe(useThemeStore.getState().syncTheme)
  })
})
