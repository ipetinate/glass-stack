import { Navigate, type RouteObject } from 'react-router'

import { ErrorBoundary } from '@/core/components/structure/ErrorBoundary'

import {
  DEFAULT_SETTINGS_TAB,
  type SettingsTabId,
  settingsTabRoutes,
  settingsTabs,
} from './pages/SettingsPage/SettingsPage.tabs'
import { SettingsPage } from './pages/SettingsPage'

export const settingsRoutes: RouteObject[] = [
  {
    path: '/settings',
    element: <SettingsPage />,
    errorElement: <ErrorBoundary />,
    children: [
      {
        index: true,
        element: <Navigate to={`/settings/${DEFAULT_SETTINGS_TAB}`} replace />,
      },
      ...settingsTabs.map((tab) => ({
        path: tab.id,
        element: settingsTabRoutes[tab.id as SettingsTabId],
      })),
      {
        path: '*',
        element: <Navigate to={`/settings/${DEFAULT_SETTINGS_TAB}`} replace />,
      },
    ],
  },
]
