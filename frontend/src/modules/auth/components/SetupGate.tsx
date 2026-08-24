import { useQuery } from '@tanstack/react-query'
import { Navigate, Outlet } from 'react-router'

import { GlassStackLoader } from '@/core/components/ui/GlassStackLoader'
import { getSetupStatus, authKeys } from '../api/auth'

export function SetupGate() {
  const setup = useQuery({
    queryKey: authKeys.setup,
    queryFn: getSetupStatus,
    staleTime: 30_000,
  })

  if (setup.isPending) {
    return (
      <div className="grid min-h-dvh place-items-center bg-[#071525] text-white">
        <GlassStackLoader label="Conectando ao Glass Stack…" size={96} />
      </div>
    )
  }

  if (setup.isError) {
    return (
      <div className="grid min-h-dvh place-items-center bg-[#071525] p-6 text-white">
        <div className="max-w-md rounded-2xl border border-white/10 bg-black/30 p-6 text-center">
          <h1 className="text-xl font-semibold">Unable to continue</h1>
          <p className="mt-2 text-sm text-white/65">
            GlassStack could not reach the server.
          </p>
        </div>
      </div>
    )
  }

  if (setup.data.required) {
    return <Navigate to="/onboarding" replace />
  }

  return <Outlet />
}
