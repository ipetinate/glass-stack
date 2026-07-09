import { describe, expect, it } from 'vitest'

import { useUnsavedChangesStore } from './unsaved-changes'

describe('useUnsavedChangesStore', () => {
  it('tracks unsaved changes by scope', () => {
    const store = useUnsavedChangesStore.getState()

    store.setUnsavedChanges('settings', true)

    expect(useUnsavedChangesStore.getState().hasUnsavedChanges('settings')).toBe(
      true,
    )
    expect(useUnsavedChangesStore.getState().hasUnsavedChanges()).toBe(true)

    useUnsavedChangesStore.getState().markSaved('settings')

    expect(useUnsavedChangesStore.getState().hasUnsavedChanges('settings')).toBe(
      false,
    )
    expect(useUnsavedChangesStore.getState().hasUnsavedChanges()).toBe(false)
  })

  it('can clear one scope or every scope', () => {
    const store = useUnsavedChangesStore.getState()

    store.setUnsavedChanges('settings', true)
    store.setUnsavedChanges('terminal', true)
    store.clearUnsavedChanges('settings')

    expect(useUnsavedChangesStore.getState().hasUnsavedChanges('settings')).toBe(
      false,
    )
    expect(useUnsavedChangesStore.getState().hasUnsavedChanges('terminal')).toBe(
      true,
    )

    useUnsavedChangesStore.getState().clearUnsavedChanges()

    expect(useUnsavedChangesStore.getState().hasUnsavedChanges()).toBe(false)
  })
})
