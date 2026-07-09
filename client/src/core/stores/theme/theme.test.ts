import { describe, expect, it, vi } from 'vitest'

import { useThemeStore } from './theme'

describe('useThemeStore', () => {
  it('sets an explicit dark theme and persists it', () => {
    vi.mocked(window.matchMedia).mockReturnValue({
      matches: false,
      media: '(prefers-color-scheme: dark)',
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })

    useThemeStore.getState().setTheme('dark')

    expect(useThemeStore.getState()).toMatchObject({
      theme: 'dark',
      resolvedTheme: 'dark',
    })
    expect(document.documentElement).toHaveClass('dark')
    expect(JSON.parse(localStorage.theme)).toMatchObject({
      state: { theme: 'dark' },
    })
  })

  it('uses the system theme and removes explicit localStorage theme', () => {
    localStorage.theme = 'light'
    vi.mocked(window.matchMedia).mockReturnValue({
      matches: false,
      media: '(prefers-color-scheme: dark)',
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })

    useThemeStore.getState().setTheme('system')

    expect(useThemeStore.getState()).toMatchObject({
      theme: 'system',
      resolvedTheme: 'light',
    })
    expect(document.documentElement).not.toHaveClass('dark')
    expect(JSON.parse(localStorage.theme)).toMatchObject({
      state: { theme: 'system' },
    })
  })

  it('syncs the resolved theme without changing the selected theme', () => {
    useThemeStore.setState({ theme: 'system', resolvedTheme: 'light' })
    vi.mocked(window.matchMedia).mockReturnValue({
      matches: true,
      media: '(prefers-color-scheme: dark)',
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })

    useThemeStore.getState().syncTheme()

    expect(useThemeStore.getState()).toMatchObject({
      theme: 'system',
      resolvedTheme: 'dark',
    })
    expect(document.documentElement).toHaveClass('dark')
  })
})
