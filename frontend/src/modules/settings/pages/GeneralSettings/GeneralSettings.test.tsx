import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { GeneralSettings } from './GeneralSettings'

describe('GeneralSettings', () => {
  it('renders the language settings section', () => {
    render(<GeneralSettings />)

    expect(
      screen.getByRole('heading', { name: 'Language' }),
    ).toBeInTheDocument()
  })
})
