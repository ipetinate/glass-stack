import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router'
import { render } from '@testing-library/react'

export function renderWithRouter(
  children: ReactNode,
  { route = '/' }: { route?: string } = {},
) {
  return render(
    <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>,
  )
}
