import type { RouteObject } from 'react-router'
import { OnboardingShell } from './components/OnboardingShell'
import { AccountPage } from './pages/AccountPage'
import { ConnectPage } from './pages/ConnectPage'
import { MfaPage } from './pages/MfaPage'
import { SecurityPage } from './pages/SecurityPage'
import { ThemePage } from './pages/ThemePage'
import { WelcomePage } from './pages/WelcomePage'
import { ErrorBoundary } from '@/core/components/structure/ErrorBoundary'

export const onboardingRoutes: RouteObject[] = [
  { path: '/onboarding', element: <OnboardingShell />, children: [
    { index: true, element: <WelcomePage />, errorElement: <ErrorBoundary /> },
    { path: 'connect', element: <ConnectPage />, errorElement: <ErrorBoundary /> },
    { path: 'account', element: <AccountPage />, errorElement: <ErrorBoundary /> },
    { path: 'theme', element: <ThemePage />, errorElement: <ErrorBoundary /> },
    { path: 'security', element: <SecurityPage />, errorElement: <ErrorBoundary /> },
    { path: 'mfa', element: <MfaPage />, errorElement: <ErrorBoundary /> },
    { path: 'welcome', element: <WelcomePage />, errorElement: <ErrorBoundary /> },
  ] },
]
