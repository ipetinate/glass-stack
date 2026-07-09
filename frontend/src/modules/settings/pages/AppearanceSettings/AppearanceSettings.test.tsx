import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { AppProviders } from '@/core/providers/AppProviders'

import { AppearanceSettings } from './AppearanceSettings'

describe('AppearanceSettings', () => {
  it('renders theme, windows, and background choices', () => {
    render(
      <AppProviders>
        <AppearanceSettings />
      </AppProviders>,
    )

    expect(screen.getByRole('heading', { name: 'Theme' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Windows' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Background' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Light/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Dark/ })).toBeInTheDocument()
  })
})
