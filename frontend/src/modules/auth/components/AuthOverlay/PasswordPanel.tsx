import { useEffect } from 'react'
import { ArrowRight } from 'lucide-react'
import { motion } from 'motion/react'

import { Avatar } from '@/core/components/ui/Avatar'
import { GlassStackLoader } from '@/core/components/ui/GlassStackLoader'
import { Input } from '@/core/components/form'
import { PinCodeField } from '@/core/components/form/PinCodeField'

import type { AuthIdentity } from '../../api/auth'
import { identityLabel, resolveAvatarImage } from './avatar'
import { useAuthFlow, type AuthFlowMode } from './useAuthFlow'

export type PasswordPanelProps = {
  identity: AuthIdentity
  mode: AuthFlowMode
  onSwitchUser?: () => void
}

export function PasswordPanel({
  identity,
  mode,
  onSwitchUser,
}: PasswordPanelProps) {
  const flow = useAuthFlow({ identity, mode })
  const image = resolveAvatarImage(identity)
  const busy = flow.submitting || flow.success
  const hasPin = Boolean(flow.challengeToken)

  useEffect(() => {
    if (hasPin && flow.code.length === 6 && !busy) {
      void flow.submit()
    }
  }, [hasPin, flow.code, busy, flow.submit])

  return (
    <div className="relative w-120 max-w-[calc(100vw-2rem)] overflow-hidden p-8">
      <div className="flex flex-col items-center text-center">
        <motion.div layoutId={`lock-avatar-${identity.id}`} className="size-[116px]">
          <Avatar
            size="xl"
            image={image}
            initials={image ? undefined : identityLabel(identity).slice(0, 2).toUpperCase()}
          />
        </motion.div>

        <p className="mt-4 text-lg font-semibold text-[#151A21] dark:text-white">
          {identityLabel(identity)}
        </p>

        <form className="mt-6 flex flex-col items-center space-y-4" onSubmit={flow.submit}>
          {hasPin ? (
            <>
              <PinCodeField
                label="Código de autenticação"
                fields={6}
                groups={2}
                separator
                value={flow.code}
                onChange={flow.setCode}
                disabled={busy}
              />
              {busy ? (
                <GlassStackLoader label="Verificando…" size={32} />
              ) : null}
            </>
          ) : (
            <div className="flex w-full max-w-xs items-center gap-2">
              <Input
                autoFocus
                type="password"
                placeholder="Senha"
                autoComplete="current-password"
                value={flow.password}
                onChange={(event) => flow.setPassword(event.target.value)}
                disabled={busy}
              />
              <button
                type="submit"
                disabled={!flow.password || busy}
                aria-label={mode === 'lock' ? 'Desbloquear' : 'Entrar'}
                className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-black/10 bg-white/30 text-[#151A21]/55 shadow-sm backdrop-blur-md transition-colors hover:bg-white/50 hover:text-[#151A21] disabled:opacity-30 dark:border-white/15 dark:bg-white/10 dark:text-white/55 dark:hover:bg-white/15 dark:hover:text-white"
              >
                <ArrowRight className="size-4" />
              </button>
            </div>
          )}

          {flow.error ? (
            <p role="alert" aria-live="assertive" className="text-xs text-rose-500">
              {flow.error}
            </p>
          ) : null}
        </form>

        {mode === 'login' && onSwitchUser ? (
          <button
            type="button"
            onClick={onSwitchUser}
            className="mt-4 text-sm font-medium text-[#151A21]/60 underline-offset-4 transition hover:text-[#151A21] hover:underline dark:text-white/60 dark:hover:text-white"
          >
            Trocar de usuário
          </button>
        ) : null}
      </div>
    </div>
  )
}
