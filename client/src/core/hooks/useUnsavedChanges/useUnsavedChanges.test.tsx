import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useUnsavedChangesStore } from '@/core/stores/unsaved-changes/unsaved-changes'

import { useUnsavedChanges } from './useUnsavedChanges'

describe('useUnsavedChanges', () => {
  it('allows closing when there are no unsaved changes', () => {
    const confirm = vi.spyOn(window, 'confirm')

    const { result } = renderHook(() =>
      useUnsavedChanges({ scope: 'settings' }),
    )

    expect(result.current.confirmClose()).toBe(true)
    expect(confirm).not.toHaveBeenCalled()
  })

  it('asks before closing when there are unsaved changes', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)

    const { result } = renderHook(() =>
      useUnsavedChanges({
        scope: 'settings',
        confirmMessage: 'Discard settings?',
      }),
    )

    act(() => result.current.setHasUnsavedChanges(true))

    expect(result.current.hasUnsavedChanges).toBe(true)
    expect(result.current.confirmClose()).toBe(false)
    expect(window.confirm).toHaveBeenCalledWith('Discard settings?')
  })

  it('allows closing after the scope is marked as saved', () => {
    const confirm = vi.spyOn(window, 'confirm')

    const { result } = renderHook(() =>
      useUnsavedChanges({ scope: 'settings' }),
    )

    act(() => result.current.setHasUnsavedChanges(true))
    act(() => result.current.markSaved())

    expect(result.current.hasUnsavedChanges).toBe(false)
    expect(result.current.confirmClose()).toBe(true)
    expect(confirm).not.toHaveBeenCalled()
  })

  it('clears its scope', () => {
    const { result } = renderHook(() =>
      useUnsavedChanges({ scope: 'settings' }),
    )

    act(() => result.current.setHasUnsavedChanges(true))
    act(() => result.current.clearUnsavedChanges())

    expect(
      useUnsavedChangesStore.getState().hasUnsavedChanges('settings'),
    ).toBe(false)
  })
})
