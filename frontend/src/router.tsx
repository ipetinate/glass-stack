import { createBrowserRouter, type RouteObject } from 'react-router'

import { ErrorBoundary } from '@/core/components/structure/ErrorBoundary'
import { AppLayout } from '@/core/layouts/AppLayout'

import { applicationsStoreRoutes } from '@/modules/applications-store/routes'
import { dashboardRoutes } from '@/modules/dashboard/routes'
import { fileManagerRoutes } from '@/modules/file-manager/routes'
import { settingsRoutes } from '@/modules/settings/routes'
import { terminalRoutes } from '@/modules/terminal/routes'

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppLayout />,
    children: dashboardRoutes,
    errorElement: <ErrorBoundary />,
  },
  {
    path: '/file-manager',
    element: <AppLayout />,
    children: fileManagerRoutes,
    errorElement: <ErrorBoundary />,
  },
  {
    path: '/applications-store',
    element: <AppLayout />,
    children: applicationsStoreRoutes,
    errorElement: <ErrorBoundary />,
  },
  {
    path: '/terminal',
    element: <AppLayout />,
    children: terminalRoutes,
    errorElement: <ErrorBoundary />,
  },
  {
    path: '/settings',
    element: <AppLayout />,
    children: settingsRoutes,
    errorElement: <ErrorBoundary />,
  },
  {
    path: '*',
    element: <AppLayout />,
    children: [
      {
        path: '*',
        element: <ErrorBoundary />,
      },
    ],
  },
]

export const router = createBrowserRouter(routes)
