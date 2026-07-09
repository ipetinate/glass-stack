import { Route, Routes } from 'react-router'
import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { renderWithRouter } from '@/test/renderWithRouter'

import { RouteTransition } from './RouteTransition'

function TransitionTestLayout() {
  return (
    <div>
      <RouteTransition />
    </div>
  )
}

describe('RouteTransition', () => {
  it('renders the active route through a motion transition shell', () => {
    const { container } = renderWithRouter(
      <Routes>
        <Route element={<TransitionTestLayout />}>
          <Route index element={<div>Dashboard page</div>} />
        </Route>
      </Routes>,
    )

    expect(screen.getByText('Dashboard page')).toBeInTheDocument()
    expect(container.querySelector('.overflow-hidden')).toBeInTheDocument()
  })
})
