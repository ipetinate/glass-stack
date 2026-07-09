import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { renderWithRouter } from '@/test/renderWithRouter'

import { SidebarButton } from './SidebarButton'

describe('SidebarButton', () => {
  it('renders a labeled navigation link with the requested icon', () => {
    renderWithRouter(
      <SidebarButton
        to="/terminal"
        icon="SquareTerminal"
        description="Terminal"
      />,
    )

    const link = screen.getByRole('link', { name: 'Terminal' })

    expect(link).toHaveAttribute('href', '/terminal')
    expect(link).toHaveClass('bg-white/80', 'dark:bg-[#151A21]')
    expect(link.querySelector('svg')).toBeInTheDocument()
    expect(link.querySelector('svg')).toHaveClass(
      'text-[#151A21]',
      'dark:text-white',
    )
  })

  it('shows an active route indicator', () => {
    const { container } = renderWithRouter(
      <SidebarButton
        to="/"
        icon="LayoutDashboard"
        description="Dashboard"
        active
      />,
    )

    expect(container.querySelector('.bg-\\[\\#00BFFF\\]')).toBeInTheDocument()
  })
})
