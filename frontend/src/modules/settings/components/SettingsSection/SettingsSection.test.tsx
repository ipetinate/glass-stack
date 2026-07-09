import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { SettingsSection } from './SettingsSection'

describe('SettingsSection', () => {
  it('renders the section title', () => {
    render(<SettingsSection title="General" />)

    expect(
      screen.getByRole('heading', { name: 'General' }),
    ).toBeInTheDocument()
  })
})
