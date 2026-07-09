import { screen } from '@testing-library/react'
import { Route, Routes } from 'react-router'
import { describe, expect, it } from 'vitest'

import { renderWithRouter } from '@/test/renderWithRouter'

import { FileManagerPage } from './FileManagerPage'

describe('FileManagerPage', () => {
  it('renders the file manager window', () => {
    renderWithRouter(
      <Routes>
        <Route path="/file-manager" element={<FileManagerPage />} />
      </Routes>,
      { route: '/file-manager' },
    )

    expect(
      screen.getByRole('heading', { name: 'File Manager' }),
    ).toBeInTheDocument()
  })
})
