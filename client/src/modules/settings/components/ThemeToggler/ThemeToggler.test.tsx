import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { useThemeStore } from '@/core/stores/theme/theme'

import { ThemeToggler } from './ThemeToggler'

describe('ThemeToggler', () => {
  it('renders theme choices', () => {
    render(<ThemeToggler />)

    expect(screen.getByRole('button', { name: /Light/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Dark/ })).toBeInTheDocument()
  })

  it('sets the selected theme', async () => {
    const user = userEvent.setup()

    useThemeStore.setState({ theme: 'light', resolvedTheme: 'light' })
    render(<ThemeToggler />)

    await user.click(screen.getByRole('button', { name: /Dark/ }))

    expect(useThemeStore.getState().theme).toBe('dark')
  })
})
