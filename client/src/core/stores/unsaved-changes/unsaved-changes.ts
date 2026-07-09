import { create } from 'zustand'

type UnsavedChangesState = {
  dirtyScopes: Record<string, boolean>
  hasUnsavedChanges: (scope?: string) => boolean
  setUnsavedChanges: (scope: string, hasUnsavedChanges: boolean) => void
  markSaved: (scope: string) => void
  clearUnsavedChanges: (scope?: string) => void
}

export const DEFAULT_UNSAVED_CHANGES_SCOPE = 'global'

export const useUnsavedChangesStore = create<UnsavedChangesState>()(
  (set, get) => ({
    dirtyScopes: {},
    hasUnsavedChanges: (scope) => {
      if (scope) return get().dirtyScopes[scope] === true

      return Object.values(get().dirtyScopes).some(Boolean)
    },
    setUnsavedChanges: (scope, hasUnsavedChanges) => {
      set((state) => ({
        dirtyScopes: {
          ...state.dirtyScopes,
          [scope]: hasUnsavedChanges,
        },
      }))
    },
    markSaved: (scope) => {
      get().setUnsavedChanges(scope, false)
    },
    clearUnsavedChanges: (scope) => {
      if (!scope) {
        set({ dirtyScopes: {} })
        return
      }

      set((state) => {
        const dirtyScopes = { ...state.dirtyScopes }

        delete dirtyScopes[scope]

        return { dirtyScopes }
      })
    },
  }),
)
