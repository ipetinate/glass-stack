import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useThemeStore } from '@/core/stores/theme/theme'

import { AppProviders } from './AppProviders'

describe('AppProviders', () => {
  it('renders children', () => {
    render(
      <AppProviders>
        <div>Application</div>
      </AppProviders>,
    )

    expect(screen.getByText('Application')).toBeInTheDocument()
  })

  it('listens to system theme changes while theme is system', () => {
    const addEventListener = vi.fn()
    const removeEventListener = vi.fn()

    vi.mocked(window.matchMedia).mockReturnValue({
      matches: true,
      media: '(prefers-color-scheme: dark)',
      onchange: null,
      addEventListener,
      removeEventListener,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })

    useThemeStore.setState({ theme: 'system', resolvedTheme: 'dark' })

    const { unmount } = render(
      <AppProviders>
        <div>Application</div>
      </AppProviders>,
    )

    expect(addEventListener).toHaveBeenCalledWith('change', expect.any(Function))

    unmount()

    expect(removeEventListener).toHaveBeenCalledWith(
      'change',
      expect.any(Function),
    )
  })
})
