import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Searchbar } from './Searchbar'

describe('Searchbar', () => {
  it('renders its blurred shell', () => {
    const { container } = render(<Searchbar />)

    expect(container.firstElementChild).toHaveClass('before:backdrop-blur-xl')
    expect(container.firstElementChild).toHaveClass('w-full')
  })
})
