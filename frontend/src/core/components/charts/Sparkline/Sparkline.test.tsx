import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Sparkline } from './Sparkline'

describe('Sparkline', () => {
  it('renders line, area and endpoint by default', () => {
    render(
      <Sparkline
        data={[4, 8, 5, 12]}
        animation={false}
        ariaLabel="Read throughput"
      />,
    )

    expect(
      screen.getByRole('img', { name: 'Read throughput' }),
    ).toBeInTheDocument()
    expect(screen.getByTestId('sparkline-line')).toHaveAttribute('d')
    expect(screen.getByTestId('sparkline-area')).toHaveAttribute('d')
    expect(screen.getByTestId('sparkline-endpoint')).toBeInTheDocument()
  })

  it('can hide area and endpoint', () => {
    render(
      <Sparkline
        data={[1, 2, 3]}
        showArea={false}
        showEndpoint={false}
        animation={false}
      />,
    )

    expect(screen.queryByTestId('sparkline-area')).not.toBeInTheDocument()
    expect(screen.queryByTestId('sparkline-endpoint')).not.toBeInTheDocument()
  })

  it('applies custom stroke width and solid color', () => {
    render(
      <Sparkline
        data={[1, 4, 2]}
        strokeWidth={6}
        color="#ff00ff"
        animation={false}
      />,
    )

    expect(screen.getByTestId('sparkline-line')).toHaveAttribute(
      'stroke-width',
      '6',
    )
    expect(screen.getByTestId('sparkline-line')).toHaveAttribute(
      'stroke',
      '#ff00ff',
    )
  })
})
