import type { RouteObject } from 'react-router'

import { ErrorBoundary } from '@/core/components/structure/ErrorBoundary'

import { TerminalPage } from './pages/TerminalPage'

export const terminalRoutes: RouteObject[] = [
  {
    index: true,
    element: <TerminalPage />,
    errorElement: <ErrorBoundary />,
  },
]
