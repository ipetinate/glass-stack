import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router'
import type { QueryClient as QueryClientInstance } from '@tanstack/react-query'

import { customRender, type CustomRenderOptions } from './test-utils'

export function renderWithRouter(
  children: ReactNode,
  {
    route = '/',
    queryClient,
    ...options
  }: CustomRenderOptions & {
    route?: string
    queryClient?: QueryClientInstance
  } = {},
) {
  return customRender(
    <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>,
    { queryClient, ...options },
  )
}
