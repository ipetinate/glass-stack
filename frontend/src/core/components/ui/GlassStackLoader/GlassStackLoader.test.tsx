import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { GlassStackLoader } from './GlassStackLoader'

describe('GlassStackLoader', () => {
  it('renders the three glass plates as an accessible status', () => {
    const { container } = render(
      <GlassStackLoader label="Conectando ao Glass Stack…" />,
    )

    expect(
      screen.getByRole('status', { name: 'Conectando ao Glass Stack…' }),
    ).toBeInTheDocument()
    expect(
      container.querySelectorAll('[data-glass-stack-loader-layer]'),
    ).toHaveLength(3)
  })

  it('supports the smallest and largest designed sizes', () => {
    const { rerender } = render(<GlassStackLoader size={24} />)
    const loader = screen.getByRole('status')

    expect(loader).toHaveStyle({ height: '24px', width: '24px' })

    rerender(<GlassStackLoader size={256} />)

    expect(loader).toHaveStyle({ height: '256px', width: '256px' })
  })
})
