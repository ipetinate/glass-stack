import type { RouteObject } from 'react-router'

import { ErrorBoundary } from '@/core/components/structure/ErrorBoundary'

import { DashboardPage } from './pages/DashboardPage/DashboardPage'

export const dashboardRoutes: RouteObject[] = [
  {
    index: true,
    element: <DashboardPage />,
    errorElement: <ErrorBoundary />,
  },
]
