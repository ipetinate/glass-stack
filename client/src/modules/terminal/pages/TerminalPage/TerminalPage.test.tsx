import { screen } from '@testing-library/react'
import { Route, Routes } from 'react-router'
import { describe, expect, it } from 'vitest'

import { renderWithRouter } from '@/test/renderWithRouter'

import { TerminalPage } from './TerminalPage'

describe('TerminalPage', () => {
  it('renders the terminal window', () => {
    renderWithRouter(
      <Routes>
        <Route path="/terminal" element={<TerminalPage />} />
      </Routes>,
      { route: '/terminal' },
    )

    expect(screen.getByRole('heading', { name: 'Terminal' })).toBeInTheDocument()
  })
})
