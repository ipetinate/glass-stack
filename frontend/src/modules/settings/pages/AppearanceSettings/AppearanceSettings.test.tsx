import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { customRender } from '@/test/test-utils'

import { AppearanceSettings } from './AppearanceSettings'

describe('AppearanceSettings', () => {
  it('renders theme, windows, and background choices', () => {
    customRender(<AppearanceSettings />)

    expect(screen.getByRole('heading', { name: 'Theme' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Windows' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Background' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Light/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Dark/ })).toBeInTheDocument()
  })
})
