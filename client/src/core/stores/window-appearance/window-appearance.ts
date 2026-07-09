import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type WindowBackgroundMode = 'blur' | 'solid'

export type WindowActionVisibility = {
  close: boolean
  maximize: boolean
  verticalExpand: boolean
}

type WindowAppearanceState = {
  actionVisibility: WindowActionVisibility
  backgroundMode: WindowBackgroundMode
  setActionVisibility: (
    action: keyof WindowActionVisibility,
    visible: boolean,
  ) => void
  setBackgroundMode: (backgroundMode: WindowBackgroundMode) => void
}

export const defaultWindowActionVisibility: WindowActionVisibility = {
  close: true,
  maximize: true,
  verticalExpand: true,
}

export const useWindowAppearanceStore = create<WindowAppearanceState>()(
  persist(
    (set) => ({
      actionVisibility: defaultWindowActionVisibility,
      backgroundMode: 'solid',
      setActionVisibility: (action, visible) => {
        set((state) => ({
          actionVisibility: {
            ...state.actionVisibility,
            [action]: visible,
          },
        }))
      },
      setBackgroundMode: (backgroundMode) => {
        set({ backgroundMode })
      },
    }),
    {
      name: 'window-appearance',
      partialize: (state) => ({
        actionVisibility: state.actionVisibility,
        backgroundMode: state.backgroundMode,
      }),
    },
  ),
)
