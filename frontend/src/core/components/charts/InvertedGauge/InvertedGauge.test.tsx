import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { InvertedGauge } from './InvertedGauge'

describe('InvertedGauge', () => {
  it('renders arc, ticks, value and status', () => {
    render(
      <InvertedGauge
        value={72}
        unit="C"
        statusLabel="Normal"
        animation={false}
        ariaLabel="CPU temperature"
      />,
    )

    expect(
      screen.getByRole('img', { name: 'CPU temperature' }),
    ).toBeInTheDocument()
    expect(screen.getByTestId('inverted-gauge-track')).toHaveAttribute('d')
    expect(screen.getByTestId('inverted-gauge-arc')).toHaveAttribute('d')
    expect(screen.getAllByTestId('inverted-gauge-tick').length).toBeGreaterThan(0)
    expect(screen.getAllByTestId('inverted-gauge-major-tick').length).toBeGreaterThan(
      0,
    )
    expect(screen.getByTestId('inverted-gauge-value')).toHaveTextContent('72C')
    expect(screen.getByTestId('inverted-gauge-status')).toHaveTextContent('Normal')
  })

  it('can hide indicator and value', () => {
    render(
      <InvertedGauge
        value={20}
        showIndicator={false}
        showValue={false}
        animation={false}
      />,
    )

    expect(screen.queryByTestId('inverted-gauge-indicator')).not.toBeInTheDocument()
    expect(screen.queryByTestId('inverted-gauge-value')).not.toBeInTheDocument()
  })

  it('renders gradient definitions when a gradient color is provided', () => {
    const { container } = render(
      <InvertedGauge
        value={40}
        animation={false}
        color={{
          type: 'linear',
          stops: [
            { offset: '0%', color: '#00f' },
            { offset: '100%', color: '#f00' },
          ],
        }}
      />,
    )

    expect(container.querySelector('linearGradient')).toBeInTheDocument()
  })
})
