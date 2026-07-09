import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { SelectableCard } from './SelectableCard'

describe('SelectableCard', () => {
  it('renders a selected card with a blurred green checkmark', () => {
    render(
      <SelectableCard
        title="Dark"
        description="Deep surfaces"
        selected
        onSelect={vi.fn()}
      >
        <span>Preview</span>
      </SelectableCard>,
    )

    expect(screen.getByRole('button', { name: /Dark/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: /Dark/ })).toHaveClass(
      'min-h-54',
    )
    expect(
      screen.getByRole('button', { name: /Dark/ }).querySelector('svg')?.parentElement,
    ).toHaveClass('text-emerald-500', 'backdrop-blur-md')
  })

  it('calls onSelect when clicked', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()

    render(
      <SelectableCard title="Light" description="Bright" onSelect={onSelect}>
        <span>Preview</span>
      </SelectableCard>,
    )

    await user.click(screen.getByRole('button', { name: /Light/ }))

    expect(onSelect).toHaveBeenCalledTimes(1)
  })
})
