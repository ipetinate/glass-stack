import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link2, LoaderCircle, LogOut, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'

import {
  cancelReviewLogin,
  getReviewSession,
  startReviewLogin,
} from '@/modules/applications-store/api/applications'
import { SettingsSection } from '@/modules/settings/components/SettingsSection/SettingsSection'
import {
  type ReviewConnection,
  type ReviewProvider,
  useReviewConnectionStore,
} from '@/core/stores/review-connection/review-connection'

function GitHubGlyph() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4 fill-current">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.5 7.5 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A7.99 7.99 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  )
}

function GoogleGlyph() {
  return (
    <span
      aria-hidden="true"
      className="flex size-4 items-center justify-center rounded-full bg-white text-[10px] font-bold text-[#1a73e8]"
    >
      G
    </span>
  )
}

const PROVIDERS: { id: ReviewProvider; label: string; icon: typeof GitHubGlyph }[] = [
  { id: 'github', label: 'GitHub', icon: GitHubGlyph },
  { id: 'google', label: 'Google', icon: GoogleGlyph },
]

function ConnectionCard({ connection }: { connection: ReviewConnection }) {
  const clearConnection = useReviewConnectionStore((s) => s.clearConnection)
  const queryClient = useQueryClient()

  const disconnectMutation = useMutation({
    mutationFn: () => cancelReviewLogin(),
    onSettled: () => {
      clearConnection(connection.provider)
      void queryClient.invalidateQueries({
        queryKey: ['applications-store', 'review-session'],
      })
    },
  })

  const provider = PROVIDERS.find((p) => p.id === connection.provider)

  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
      {connection.avatarUrl ? (
        <img
          src={connection.avatarUrl}
          alt=""
          className="size-10 rounded-full object-cover"
        />
      ) : (
        <div className="flex size-10 items-center justify-center rounded-full bg-white/10">
          {provider ? <provider.icon /> : <Link2 className="size-4 text-white/60" />}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">
          {connection.login}
        </p>
        <p className="text-xs text-white/50">{provider?.label ?? connection.provider}</p>
      </div>
      <button
        type="button"
        disabled={disconnectMutation.isPending}
        onClick={() => disconnectMutation.mutate()}
        className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/10 text-white/50 transition-colors hover:border-rose-400/40 hover:text-rose-300 disabled:opacity-40"
        title="Disconnect"
      >
        {disconnectMutation.isPending ? (
          <LoaderCircle className="size-3.5 animate-spin" />
        ) : (
          <LogOut className="size-3.5" />
        )}
      </button>
    </div>
  )
}

function ConnectProvider({ provider }: { provider: ReviewProvider }) {
  const setConnection = useReviewConnectionStore((s) => s.setConnection)
  const queryClient = useQueryClient()
  const [userCode, setUserCode] = useState<string | null>(null)
  const [verificationUri, setVerificationUri] = useState<string | null>(null)

  const startMutation = useMutation({
    mutationFn: () => startReviewLogin(provider),
    onSuccess: (session) => {
      if (session.userCode) setUserCode(session.userCode)
      if (session.verificationUri) setVerificationUri(session.verificationUri)
    },
  })

  useEffect(() => {
    if (!userCode) return

    let active = true
    const poll = async () => {
      while (active) {
        await new Promise((r) => setTimeout(r, 4000))
        if (!active) break
        try {
          const session = await getReviewSession()
          if (!active) break
          if (session.status === 'authenticated' && session.login) {
            setConnection({
              provider,
              login: session.login,
              avatarUrl: session.avatarUrl,
            })
            setUserCode(null)
            setVerificationUri(null)
            void queryClient.invalidateQueries({
              queryKey: ['applications-store', 'review-session'],
            })
            break
          }
          if (session.status === 'expired' || session.status === 'denied' || session.status === 'failed') {
            setUserCode(null)
            setVerificationUri(null)
            break
          }
        } catch {
          break
        }
      }
    }
    void poll()
    return () => {
      active = false
    }
  }, [userCode, provider, setConnection, queryClient])

  if (userCode) {
    return (
      <div className="rounded-xl border border-cyan-300/20 bg-cyan-500/5 p-4">
        <p className="text-xs text-white/70">
          Open the authorization page and enter the code to connect your{' '}
          {provider === 'google' ? 'Google' : 'GitHub'} account.
        </p>
        <div className="mt-3 flex items-center justify-center gap-2">
          <code className="rounded-md border border-cyan-300/40 bg-black/50 px-4 py-2 font-mono text-xl tracking-[0.3em] text-cyan-200">
            {userCode}
          </code>
        </div>
        <a
          href={verificationUri || 'https://github.com/login/device'}
          target="_blank"
          rel="noreferrer"
          className="mt-3 flex items-center justify-center gap-1.5 text-xs text-[#00bfff] hover:text-[#33ccff]"
        >
          Open authorization page
        </a>
        <p className="mt-2 flex items-center justify-center gap-2 text-[11px] text-white/50">
          <LoaderCircle className="size-3 animate-spin" />
          Waiting for authorization…
        </p>
        <button
          type="button"
          onClick={() => {
            setUserCode(null)
            setVerificationUri(null)
            startMutation.reset()
          }}
          className="mt-3 w-full text-center text-xs text-white/40 hover:text-white/70"
        >
          Cancel
        </button>
      </div>
    )
  }

  const providerInfo = PROVIDERS.find((p) => p.id === provider)

  return (
    <button
      type="button"
      disabled={startMutation.isPending}
      onClick={() => startMutation.mutate()}
      className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4 transition-colors hover:border-white/20 hover:bg-white/10 disabled:opacity-50"
    >
      <div className="flex size-10 items-center justify-center rounded-full bg-white/10">
        {providerInfo ? <providerInfo.icon /> : <Link2 className="size-4 text-white/60" />}
      </div>
      <div className="text-left">
        <p className="text-sm font-medium text-white">Connect {providerInfo?.label}</p>
        <p className="text-xs text-white/50">Link your {providerInfo?.label} account</p>
      </div>
      {startMutation.isPending && (
        <LoaderCircle className="ml-auto size-4 animate-spin text-white/50" />
      )}
    </button>
  )
}

export function ConnectionsSettings() {
  const connections = useReviewConnectionStore((s) => s.connections)
  const clearAll = useReviewConnectionStore((s) => s.clearAll)
  const queryClient = useQueryClient()

  const hasConnections = connections.length > 0

  return (
    <div>
      <SettingsSection title="Store Reviews">
        <div className="flex w-full max-w-lg flex-col gap-3">
          {hasConnections ? (
            <>
              {connections.map((conn) => (
                <ConnectionCard key={conn.provider} connection={conn} />
              ))}
              <button
                type="button"
                onClick={() => {
                  clearAll()
                  void queryClient.invalidateQueries({
                    queryKey: ['applications-store', 'review-session'],
                  })
                }}
                className="flex items-center gap-2 self-start rounded-lg px-3 py-1.5 text-xs text-white/40 transition-colors hover:text-rose-300"
              >
                <Trash2 className="size-3" />
                Disconnect all
              </button>
            </>
          ) : (
            <p className="text-sm text-white/50">
              No accounts connected. Connect an account to publish reviews on the App Store.
            </p>
          )}

          {PROVIDERS.filter(
            (p) => !connections.some((c) => c.provider === p.id),
          ).map((p) => (
            <ConnectProvider key={p.id} provider={p.id} />
          ))}
        </div>
      </SettingsSection>
    </div>
  )
}
