import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Widget } from './Widget'

describe('Widget', () => {
  it('renders children inside a full-size blurred surface', () => {
    const { container } = render(<Widget title="Storage">Content</Widget>)

    expect(screen.getByText('Storage')).toBeInTheDocument()
    expect(screen.getByText('Content')).toBeInTheDocument()
    expect(container.firstElementChild).toHaveClass('before:backdrop-blur-xl')
    expect(container.firstElementChild).toHaveClass('h-full', 'w-full')
    expect(container.firstElementChild).toHaveClass(
      'shadow-none',
      'dark:shadow-none',
    )
  })
})
