import { screen } from '@testing-library/react'
import { Route, Routes } from 'react-router'
import { describe, expect, it } from 'vitest'

import { renderWithRouter } from '@/test/renderWithRouter'

import { ApplicationsStore } from './ApplicationsStore'

describe('ApplicationsStore', () => {
  it('renders the applications store window', () => {
    renderWithRouter(
      <Routes>
        <Route path="/applications-store" element={<ApplicationsStore />} />
      </Routes>,
      { route: '/applications-store' },
    )

    expect(
      screen.getByRole('heading', { name: 'Applications Store' }),
    ).toBeInTheDocument()
  })
})
