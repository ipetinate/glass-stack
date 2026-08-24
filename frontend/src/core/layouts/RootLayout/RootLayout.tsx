import { Outlet, useLocation } from 'react-router'

import { useLockStore } from '@/core/stores/lock'
import { AuthOverlay } from '@/modules/auth/components/AuthOverlay'

export function RootLayout() {
  const locked = useLockStore((state) => state.locked)
  const { pathname } = useLocation()
  const isOnboarding = pathname.startsWith('/onboarding')

  return (
    <>
      <div inert={locked && !isOnboarding ? true : undefined}>
        <Outlet />
      </div>
      {isOnboarding ? null : <AuthOverlay />}
    </>
  )
}
