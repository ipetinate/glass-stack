import type { RouteObject } from 'react-router'

import { ErrorBoundary } from '@/core/components/structure/ErrorBoundary'

import { StoreDetail } from './pages/StoreDetail'
import { StoreLayout } from './pages/StoreLayout'
import { StoreListing } from './pages/StoreListing'

export const applicationsStoreRoutes: RouteObject[] = [
  {
    element: <StoreLayout />,
    errorElement: <ErrorBoundary />,
    children: [
      {
        index: true,
        element: <StoreListing />,
        errorElement: <ErrorBoundary />,
      },
      {
        path: ':appId',
        element: <StoreDetail />,
        errorElement: <ErrorBoundary />,
      },
    ],
  },
]
