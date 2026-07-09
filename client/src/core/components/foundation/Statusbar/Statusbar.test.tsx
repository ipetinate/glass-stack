import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { PropsWithChildren } from 'react'
import { describe, expect, it } from 'vitest'

import { Statusbar } from './Statusbar'

const renderWithQueryClient = (children: React.ReactNode) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
  const wrapper = ({ children: wrapperChildren }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{wrapperChildren}</QueryClientProvider>
  )

  return render(children, { wrapper })
}

describe('Statusbar', () => {
  it('renders its blurred shell with status content', () => {
    const { container } = renderWithQueryClient(<Statusbar />)

    expect(container.firstElementChild).toHaveClass('before:backdrop-blur-xl')
    expect(container.firstElementChild).toHaveClass('w-full')
  })

  it('opens clock settings without changing the shell layout', async () => {
    const user = userEvent.setup()
    const { container } = renderWithQueryClient(<Statusbar />)

    await user.click(screen.getByRole('button', { name: 'Open clock settings' }))

    expect(screen.getByText('Clock')).toBeInTheDocument()
    expect(screen.getByLabelText('Show seconds')).toBeChecked()
    expect(screen.getByRole('button', { name: 'Open clock settings' })).not.toHaveClass(
      'hover:bg-black/5',
      'dark:hover:bg-white/10',
    )
    expect(container.firstElementChild).toHaveClass('overflow-visible', 'z-50')
    expect(screen.getByTestId('statusbar-popover')).toHaveClass(
      'before:backdrop-blur-xl',
      'fixed',
      'z-[9999]',
      'transform-none',
    )
  })

  it('opens weather settings', async () => {
    const user = userEvent.setup()

    renderWithQueryClient(<Statusbar />)

    await user.click(screen.getByRole('button', { name: 'Open weather settings' }))

    expect(screen.getByText('Weather')).toBeInTheDocument()
    expect(screen.getByLabelText('Show icon')).toBeChecked()
    expect(screen.getByLabelText('Show condition')).toBeChecked()
    expect(
      screen.getByLabelText('Search city, ZIP or postal code'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Use my location' })).toBeInTheDocument()
  })

  it('opens profile settings', async () => {
    const user = userEvent.setup()

    renderWithQueryClient(<Statusbar />)

    await user.click(screen.getByRole('button', { name: 'Open profile settings' }))

    expect(screen.getByText('Profile')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Manage password' })).toBeInTheDocument()
  })

  it('closes the active dropdown when clicking outside', async () => {
    const user = userEvent.setup()

    renderWithQueryClient(
      <div>
        <Statusbar />
        <button type="button">Outside</button>
      </div>,
    )

    await user.click(screen.getByRole('button', { name: 'Open weather settings' }))

    expect(screen.getByText('Weather')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Outside' }))

    expect(screen.queryByText('Weather')).not.toBeInTheDocument()
  })

  it('keeps the active dropdown open when clicking inside it', async () => {
    const user = userEvent.setup()

    renderWithQueryClient(<Statusbar />)

    await user.click(screen.getByRole('button', { name: 'Open weather settings' }))
    await user.click(screen.getByLabelText('Show icon'))

    expect(screen.getByText('Weather')).toBeInTheDocument()
  })
})
