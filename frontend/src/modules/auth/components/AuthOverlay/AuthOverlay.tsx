import { useQuery } from '@tanstack/react-query'
import { AlertCircle } from 'lucide-react'
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'motion/react'

import { Button } from '@/core/components/ui/Button'
import { Clock } from '@/core/components/ui/Clock'
import { useAppStore } from '@/core/stores/app'
import { useLockStore } from '@/core/stores/lock'

import { authKeys, listIdentities, type AuthIdentity } from '../../api/auth'
import { PasswordPanel } from './PasswordPanel'
import { UserPicker } from './UserPicker'
import type { AuthFlowMode } from './useAuthFlow'

export function AuthOverlay() {
  const locked = useLockStore((state) => state.locked)
  const user = useAppStore((state) => state.user)
  const selectedUserId = useLockStore((state) => state.selectedUserId)
  const rememberedUserId = useLockStore((state) => state.rememberedUserId)
  const selectUser = useLockStore((state) => state.selectUser)
  const showUserPicker = useLockStore((state) => state.showUserPicker)
  const shouldReduceMotion = useReducedMotion()

  const identitiesQuery = useQuery({
    queryKey: authKeys.identities,
    queryFn: listIdentities,
    enabled: locked,
    retry: false,
    staleTime: 30_000,
  })

  const identities = identitiesQuery.data?.identities ?? []
  const mode: AuthFlowMode = user ? 'lock' : 'login'
  const target =
    user ??
    identities.find(
      (identity) => identity.id === (selectedUserId ?? rememberedUserId),
    ) ??
    null

  return (
    <AnimatePresence>
      {locked ? (
        <motion.div
          className="fixed inset-0 z-[100] overflow-hidden"
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: '-100%' }}
          animate={{ opacity: 1, y: 0 }}
          exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: '-100%' }}
          transition={{
            duration: shouldReduceMotion ? 0.15 : 0.5,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          <div
            aria-hidden
            className="absolute inset-0 scale-105"
            style={{
              background: 'var(--app-wallpaper-background)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-[#071525]/55 backdrop-blur-2xl dark:bg-black/60"
          />

          <div className="relative z-10 flex h-full flex-col items-center">
            <div className="mt-[7vh] text-center">
              <Clock
                variant="HH:mm"
                hourVariant="24"
                showDate
                dateFormat="compact"
                dayVariant="long"
                timeClassName="text-7xl text-white/95 sm:text-8xl"
                dateClassName="text-lg text-white/70"
              />
            </div>

            <div className="relative flex flex-1 items-center justify-center content-center px-6">
              <LayoutGroup>
                {!target ? (
                <UserPicker
                  identities={identities}
                  loading={mode === 'login' && identitiesQuery.isPending}
                  onSelect={(identity) => selectUser(identity.id)}
                />
              ) : null}

                {mode === 'login' && identitiesQuery.isError ? (
                  <UnavailableError onRetry={() => void identitiesQuery.refetch()} />
                ) : null}

                <AnimatePresence>
                  {target ? (
                    <motion.div
                      className="absolute place-items-center flex w-120"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <PasswordPanel
                        key={target.id}
                        identity={target as AuthIdentity}
                        mode={mode}
                        onSwitchUser={mode === 'login' ? showUserPicker : undefined}
                      />
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </LayoutGroup>
            </div>

            <p className="mb-[5vh] text-xs font-semibold uppercase tracking-[0.3em] text-white/55">
              GlassStack
            </p>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

function UnavailableError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <AlertCircle className="size-10 text-white/70" />
      <p className="max-w-sm text-sm text-white/75">
        Não foi possível carregar as contas disponíveis. Verifique a conexão e
        tente novamente.
      </p>
      <Button type="button" onClick={onRetry}>
        Tentar novamente
      </Button>
    </div>
  )
}
