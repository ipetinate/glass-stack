import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { useWindowAppearanceStore } from '@/core/stores/window-appearance'

import { WindowSettings } from './WindowSettings'

describe('WindowSettings', () => {
  beforeEach(() => {
    useWindowAppearanceStore.setState({
      actionVisibility: {
        close: true,
        maximize: true,
        verticalExpand: true,
      },
      backgroundMode: 'solid',
    })
  })

  it('renders background modes and action toggles', () => {
    render(<WindowSettings />)

    expect(
      screen.getByRole('button', { name: 'Use Solid windows' }),
    ).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Recommended')).toBeInTheDocument()
    expect(screen.getByLabelText('Expand up')).toBeChecked()
    expect(screen.getByLabelText('Maximize')).toBeChecked()
    expect(screen.getByLabelText('Close')).toBeChecked()
  })

  it('updates window appearance preferences', async () => {
    const user = userEvent.setup()

    render(<WindowSettings />)

    await user.click(screen.getByRole('button', { name: 'Use Blur windows' }))
    await user.click(screen.getByLabelText('Maximize'))

    expect(useWindowAppearanceStore.getState().backgroundMode).toBe('blur')
    expect(useWindowAppearanceStore.getState().actionVisibility.maximize).toBe(
      false,
    )
  })
})
