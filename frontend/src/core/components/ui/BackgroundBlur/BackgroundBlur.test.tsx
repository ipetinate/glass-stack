import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { BackgroundBlur } from './BackgroundBlur'

describe('BackgroundBlur', () => {
  it('renders children inside the default visual surface', () => {
    render(<BackgroundBlur>Content</BackgroundBlur>)

    expect(screen.getByText('Content')).toBeInTheDocument()
    expect(screen.getByText('Content')).toHaveClass(
      'before:backdrop-blur-xl',
      'bg-white/58',
      'dark:bg-black/35',
      'border-white/55',
      'dark:border-white/10',
    )
  })

  it('can render as another element and merge custom class names', () => {
    render(
      <BackgroundBlur as="section" aria-label="Panel" className="p-4">
        Content
      </BackgroundBlur>,
    )

    const panel = screen.getByRole('region', { name: 'Panel' })

    expect(panel.tagName).toBe('SECTION')
    expect(panel).toHaveClass('before:backdrop-blur-xl', 'p-4')
  })
})
