import { useThemeStore } from '@/core/stores/theme/theme'

export function useTheme() {
  const theme = useThemeStore((state) => state.theme)
  const resolvedTheme = useThemeStore((state) => state.resolvedTheme)
  const setTheme = useThemeStore((state) => state.setTheme)
  const syncTheme = useThemeStore((state) => state.syncTheme)

  return {
    theme,
    resolvedTheme,
    setTheme,
    syncTheme,
  }
}
