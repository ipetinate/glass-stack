import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { MultiRingGauge } from './MultiRingGauge'

describe('MultiRingGauge', () => {
  it('renders independent rings with custom and default colors', () => {
    render(
      <MultiRingGauge
        ariaLabel="CPU load"
        label="CPU"
        centerValue={72}
        rings={[
          {
            id: 'overall',
            label: 'Overall',
            value: 72,
            color: '#ff00aa',
            description: 'Total CPU usage',
          },
          { id: 'core', label: 'Core avg', value: null },
        ]}
      />,
    )

    expect(screen.getByRole('img', { name: 'CPU load' })).toBeInTheDocument()
    expect(screen.getByText('Overall')).toBeInTheDocument()
    expect(screen.getByText('Core avg')).toBeInTheDocument()
    expect(screen.getAllByText('72%')).toHaveLength(2)
    expect(screen.getByText('—')).toBeInTheDocument()
    expect(screen.getAllByTestId('multi-ring-track')).toHaveLength(2)
    expect(screen.getByTestId('multi-ring-value-0')).toHaveAttribute(
      'fill',
      '#ff00aa',
    )
    expect(screen.queryByTestId('multi-ring-value-1')).not.toBeInTheDocument()
  })

  it('shows a themed tooltip for the hovered ring', () => {
    render(
      <MultiRingGauge
        rings={[{ id: 'gpu', label: 'Renderer', value: 41, color: '#62dfff', description: 'GPU renderer load' }]}
      />,
    )

    fireEvent.pointerEnter(screen.getByTestId('multi-ring-value-0'))
    fireEvent.pointerMove(screen.getByTestId('multi-ring-value-0'), {
      clientX: 120,
      clientY: 80,
    })

    expect(screen.getByText('GPU renderer load')).toBeInTheDocument()
    expect(screen.getAllByText('41%').length).toBeGreaterThan(0)
  })
})
