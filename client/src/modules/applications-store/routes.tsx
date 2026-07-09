import type { RouteObject } from 'react-router'

import { ErrorBoundary } from '@/core/components/structure/ErrorBoundary'

import { ApplicationsStore } from './pages/ApplicationsStore'

export const applicationsStoreRoutes: RouteObject[] = [
  {
    index: true,
    element: <ApplicationsStore />,
    errorElement: <ErrorBoundary />,
  },
]
