import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ServicesSettings } from './ServicesSettings'

describe('ServicesSettings', () => {
  it('renders the services settings section', () => {
    render(<ServicesSettings />)

    expect(
      screen.getByRole('heading', { name: 'Services' }),
    ).toBeInTheDocument()
  })
})
