import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { TabTrigger } from './TabTrigger'

describe('TabTrigger', () => {
  it('applies the active background blur to the full trigger surface', () => {
    const { container } = render(
      <TabTrigger
        id="general"
        title="General"
        icon="Settings"
        selected
        onActivate={vi.fn()}
        onClose={vi.fn()}
        onPinChange={vi.fn()}
      />,
    )

    const activeBackground = container.querySelector(
      '.before\\:backdrop-blur-xl',
    )

    expect(container.firstElementChild).not.toHaveClass('before:backdrop-blur-xl')
    expect(activeBackground).toHaveClass(
      'bg-white/68',
      'dark:bg-black/25',
    )
    expect(screen.getByRole('tab', { name: 'General' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  it('does not apply the background blur to inactive triggers', () => {
    const { container } = render(
      <TabTrigger
        id="general"
        title="General"
        icon="Settings"
        onActivate={vi.fn()}
        onClose={vi.fn()}
        onPinChange={vi.fn()}
      />,
    )

    expect(container.firstElementChild).not.toHaveClass('before:backdrop-blur-xl')
    expect(container.firstElementChild).not.toHaveClass('bg-white/68')
    expect(container.firstElementChild).not.toHaveClass('dark:bg-black/25')
  })

  it('calls trigger actions', async () => {
    const user = userEvent.setup()
    const onActivate = vi.fn()
    const onClose = vi.fn()
    const onPinChange = vi.fn()

    render(
      <TabTrigger
        id="general"
        title="General"
        icon="Settings"
        allowClose
        allowPin
        onActivate={onActivate}
        onClose={onClose}
        onPinChange={onPinChange}
      />,
    )

    await user.click(screen.getByRole('tab', { name: 'General' }))
    await user.click(screen.getByRole('button', { name: 'Pin General' }))
    await user.click(screen.getByRole('button', { name: 'Close General' }))

    expect(onActivate).toHaveBeenCalledTimes(1)
    expect(onPinChange).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
