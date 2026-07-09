import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { renderWithRouter } from '@/test/renderWithRouter'

import { Sidebar } from './Sidebar'

describe('Sidebar', () => {
  it('renders primary navigation entries', () => {
    renderWithRouter(<Sidebar />)

    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute(
      'href',
      '/',
    )
    expect(screen.getByRole('link', { name: 'File Manager' })).toHaveAttribute(
      'href',
      '/file-manager',
    )
    expect(screen.getByRole('link', { name: 'Terminal' })).toHaveAttribute(
      'href',
      '/terminal',
    )
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute(
      'href',
      '/settings',
    )
  })
})
