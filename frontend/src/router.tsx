import { createBrowserRouter, type RouteObject } from 'react-router'

import { ErrorBoundary } from '@/core/components/structure/ErrorBoundary'
import { AppLayout } from '@/core/layouts/AppLayout'

import { applicationsStoreRoutes } from '@/modules/applications-store/routes'
import { AuthGate, InvitationPage, LoginPage, ProfilePage } from '@/modules/auth'
import { onboardingRoutes } from '@/modules/onboarding'
import { dashboardRoutes } from '@/modules/dashboard/routes'
import { fileManagerRoutes } from '@/modules/file-manager/routes'
import { settingsRoutes } from '@/modules/settings/routes'
import { terminalRoutes } from '@/modules/terminal/routes'

export const routes: RouteObject[] = [
  {
    path: '/login',
    element: <LoginPage />,
  },
  ...onboardingRoutes,
  {
    path: '/invite',
    element: <InvitationPage />,
  },
  {
    element: <AuthGate />,
    children: [
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
        path: '/app-store',
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
        path: '/profile',
        element: <AppLayout />,
        children: [{ path: '', element: <ProfilePage /> }],
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
        errorElement: <ErrorBoundary />,
      },
    ],
  },
]

export const router = createBrowserRouter(routes)
