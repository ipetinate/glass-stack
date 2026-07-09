import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Skeleton } from './Skeleton'

describe('Skeleton', () => {
  it('renders an inert loading placeholder with custom classes', () => {
    render(<Skeleton data-testid="skeleton" className="h-10 w-20" />)

    expect(screen.getByTestId('skeleton')).toHaveClass(
      'animate-pulse',
      'h-10',
      'w-20',
    )
    expect(screen.getByTestId('skeleton')).toHaveAttribute('aria-hidden', 'true')
  })
})
