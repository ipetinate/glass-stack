import type { RouteObject } from 'react-router'

import { ErrorBoundary } from '@/core/components/structure/ErrorBoundary'

import { SettingsPage } from './pages/SettingsPage'

export const settingsRoutes: RouteObject[] = [
  {
    index: true,
    element: <SettingsPage />,
    errorElement: <ErrorBoundary />,
  },
]
