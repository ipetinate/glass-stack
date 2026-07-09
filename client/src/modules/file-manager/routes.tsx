import type { RouteObject } from 'react-router'

import { ErrorBoundary } from '@/core/components/structure/ErrorBoundary'

import { FileManagerPage } from './pages/FileManagerPage'

export const fileManagerRoutes: RouteObject[] = [
  {
    index: true,
    element: <FileManagerPage />,
    errorElement: <ErrorBoundary />,
  },
]
