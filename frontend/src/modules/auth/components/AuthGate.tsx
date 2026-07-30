import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'

import { GlassAPIError } from '@/lib/glass-api'
import { useAppStore } from '@/core/stores/app'
import { PreferencesSync } from '@/modules/settings/components/PreferencesSync'

import { authKeys, getSession, getSetupStatus } from '../api/auth'

export function AuthGate() {
  const location = useLocation()
  const setup = useQuery({
    queryKey: authKeys.setup,
    queryFn: getSetupStatus,
    staleTime: 30_000,
  })
  const session = useQuery({
    queryKey: authKeys.session,
    queryFn: getSession,
    retry: false,
    enabled: setup.data?.required === false,
    staleTime: 30_000,
  })
  const setUser = useAppStore((state) => state.setUser)
  const clearUser = useAppStore((state) => state.clearUser)

  useEffect(() => {
    if (session.data?.user) setUser(session.data.user)
    if (session.error instanceof GlassAPIError && session.error.status === 401) clearUser()
  }, [clearUser, session.data?.user, session.error, setUser])

  if (setup.isPending || (setup.data?.required === false && session.isPending)) {
    return <AuthLoading />
  }
  if (setup.isError) {
    return <AuthFailure message="GlassStack could not reach the server." />
  }
  if (setup.data.required) {
    return <Navigate to="/onboarding" replace />
  }
  if (
    session.error instanceof GlassAPIError &&
    session.error.status === 401
  ) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    )
  }
  if (session.isError) {
    return <AuthFailure message="Your session could not be verified." />
  }
  return (
    <>
      <PreferencesSync />
      <Outlet />
    </>
  )
}

function AuthLoading() {
  return (
    <div className="grid min-h-dvh place-items-center bg-[#071525] text-white">
      <div role="status" className="flex items-center gap-3 text-sm text-white/70">
        <span className="size-4 animate-spin rounded-full border-2 border-white/20 border-t-cyan-300" />
        Connecting to GlassStack…
      </div>
    </div>
  )
}

function AuthFailure({ message }: { message: string }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-[#071525] p-6 text-white">
      <div className="max-w-md rounded-2xl border border-white/10 bg-black/30 p-6 text-center">
        <h1 className="text-xl font-semibold">Unable to continue</h1>
        <p className="mt-2 text-sm text-white/65">{message}</p>
      </div>
    </div>
  )
}
