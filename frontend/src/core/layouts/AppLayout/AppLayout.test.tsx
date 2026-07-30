import { screen } from '@testing-library/react'
import {
  createMemoryRouter,
  Route,
  RouterProvider,
  Routes,
} from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import { ErrorBoundary } from '@/core/components/structure/ErrorBoundary'
import { renderWithRouter } from '@/test/renderWithRouter'
import { customRender } from '@/test/test-utils'

import { AppLayout } from './AppLayout'

describe('AppLayout', () => {
  it('renders shell navigation and nested route content', () => {
    const { container } = renderWithRouter(
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<div>Nested page</div>} />
        </Route>
      </Routes>,
    )

    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument()
    expect(screen.getByText('Nested page')).toBeInTheDocument()
    expect(container.firstElementChild).toHaveClass('h-dvh', 'max-h-dvh')
    expect(container.querySelector('main')).toHaveClass('overflow-hidden')
    expect(container.querySelector('main')).toHaveClass('h-full', 'min-h-0')
    expect(container.querySelector('main')).not.toHaveClass(
      'backdrop-blur-md',
    )
  })

  it('renders route errors inside the content grid without losing the shell', () => {
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined)
    const BrokenPage = () => {
      throw new Error('Store exploded')
    }
    const router = createMemoryRouter([
      {
        path: '/',
        element: <AppLayout />,
        children: [
          {
            index: true,
            element: <BrokenPage />,
            errorElement: <ErrorBoundary />,
          },
        ],
      },
    ])

    customRender(<RouterProvider router={router} />)

    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Something went wrong' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Store exploded')).toBeInTheDocument()

    consoleErrorSpy.mockRestore()
  })
})
