import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemeMode = 'light' | 'dark' | 'system'

type ThemeState = {
  theme: ThemeMode
  resolvedTheme: 'light' | 'dark'
  setTheme: (theme: ThemeMode) => void
  syncTheme: () => void
}

const getSystemTheme = () =>
  window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'

const applyThemeClass = (theme: ThemeMode) => {
  const resolvedTheme = theme === 'system' ? getSystemTheme() : theme

  document.documentElement.classList.toggle('dark', resolvedTheme === 'dark')

  return resolvedTheme
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'system',
      resolvedTheme: 'dark',
      setTheme: (theme) => {
        const resolvedTheme = applyThemeClass(theme)

        if (theme === 'system') {
          localStorage.removeItem('theme')
        } else {
          localStorage.theme = theme
        }

        set({ theme, resolvedTheme })
      },
      syncTheme: () => {
        set((state) => {
          const resolvedTheme = applyThemeClass(state.theme)

          return { resolvedTheme }
        })
      },
    }),
    {
      name: 'theme',
      partialize: (state) => ({ theme: state.theme }),
      onRehydrateStorage: () => (state) => {
        if (!state) return

        const storedTheme = state.theme ?? 'system'
        const resolvedTheme = applyThemeClass(storedTheme)

        state.resolvedTheme = resolvedTheme
      },
    },
  ),
)
