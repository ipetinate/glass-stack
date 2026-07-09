import {
  DEFAULT_UNSAVED_CHANGES_SCOPE,
  useUnsavedChangesStore,
} from '@/core/stores/unsaved-changes/unsaved-changes'

const DEFAULT_CONFIRM_MESSAGE =
  'You have unsaved changes. Close this window anyway?'

export type UseUnsavedChangesOptions = {
  scope?: string
  confirmMessage?: string
}

export function useUnsavedChanges({
  scope = DEFAULT_UNSAVED_CHANGES_SCOPE,
  confirmMessage = DEFAULT_CONFIRM_MESSAGE,
}: UseUnsavedChangesOptions = {}) {
  const hasUnsavedChanges = useUnsavedChangesStore((state) =>
    state.hasUnsavedChanges(scope),
  )
  const setUnsavedChanges = useUnsavedChangesStore(
    (state) => state.setUnsavedChanges,
  )
  const markSaved = useUnsavedChangesStore((state) => state.markSaved)
  const clearUnsavedChanges = useUnsavedChangesStore(
    (state) => state.clearUnsavedChanges,
  )

  const confirmClose = (targetScope = scope) => {
    if (!useUnsavedChangesStore.getState().hasUnsavedChanges(targetScope)) {
      return true
    }

    return window.confirm(confirmMessage)
  }

  return {
    hasUnsavedChanges,
    setHasUnsavedChanges: (nextHasUnsavedChanges: boolean) =>
      setUnsavedChanges(scope, nextHasUnsavedChanges),
    markSaved: () => markSaved(scope),
    clearUnsavedChanges: () => clearUnsavedChanges(scope),
    confirmClose,
  }
}
