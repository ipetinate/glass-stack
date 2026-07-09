import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { RadialDonut } from './RadialDonut'

describe('RadialDonut', () => {
  it('renders track, arc and center dot by default', () => {
    render(<RadialDonut value={64} animation={false} ariaLabel="Storage" />)

    expect(screen.getByRole('img', { name: 'Storage' })).toBeInTheDocument()
    expect(screen.getByTestId('radial-donut-track')).toHaveAttribute('d')
    expect(screen.getByTestId('radial-donut-arc')).toHaveAttribute('d')
    expect(screen.getByTestId('radial-donut-center-dot')).toBeInTheDocument()
  })

  it('respects indicator and dot props', () => {
    render(
      <RadialDonut
        value={30}
        centerDot={false}
        showIndicator
        indicatorColor="#0f0"
        animation={false}
      />,
    )

    expect(screen.queryByTestId('radial-donut-center-dot')).not.toBeInTheDocument()
    expect(screen.getByTestId('radial-donut-indicator')).toHaveAttribute(
      'fill',
      '#0f0',
    )
  })

  it('renders gradient definitions when a gradient color is provided', () => {
    const { container } = render(
      <RadialDonut
        value={90}
        animation={false}
        color={{
          type: 'linear',
          stops: [
            { offset: '0%', color: '#fff' },
            { offset: '100%', color: '#000' },
          ],
        }}
      />,
    )

    expect(container.querySelector('linearGradient')).toBeInTheDocument()
  })

  it('renders striped variant as a full disk without value arc', () => {
    render(<RadialDonut value={82} striped animation={false} />)

    expect(screen.getByTestId('radial-donut-stripes')).toBeInTheDocument()
    expect(screen.queryByTestId('radial-donut-arc')).not.toBeInTheDocument()
  })
})
