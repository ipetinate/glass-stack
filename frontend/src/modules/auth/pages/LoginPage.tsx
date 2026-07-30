import { useQueryClient } from '@tanstack/react-query'
import { LockKeyhole, ShieldCheck } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'

import { GlassInput } from '@/core/components/form'
import { GlassAPIError } from '@/lib/glass-api'
import { useAppStore } from '@/core/stores/app'

import {
  authKeys,
  completeLoginMFA,
  login,
} from '../api/auth'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [challengeToken, setChallengeToken] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const setUser = useAppStore((state) => state.setUser)
  const destination =
    (location.state as { from?: string } | null)?.from ?? '/'

  if (window.location.pathname === '/login' && queryClient.getQueryData(authKeys.session)) {
    return <Navigate to="/" replace />
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      if (challengeToken) {
        const result = await completeLoginMFA({ challengeToken, code })
        setUser(result.user)
      } else {
        const result = await login({ username, password })
        if (result.mfaRequired) {
          setChallengeToken(result.challengeToken)
          return
        }
        setUser(result.user)
      }
      await queryClient.invalidateQueries({ queryKey: authKeys.session })
      navigate(destination, { replace: true })
    } catch (requestError) {
      setError(
        requestError instanceof GlassAPIError
          ? requestError.message
          : 'The login could not be completed.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthSurface>
      <form onSubmit={submit} className="w-full max-w-md">
        <div className="mb-8 flex size-14 items-center justify-center rounded-2xl bg-cyan-300/10 text-cyan-200">
          {challengeToken ? <ShieldCheck size={28} /> : <LockKeyhole size={28} />}
        </div>
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-200/70">
          GlassStack
        </p>
        <h1 className="mt-3 text-4xl font-light">
          {challengeToken ? 'Two-factor authentication' : 'Welcome back'}
        </h1>
        <p className="mt-3 text-white/55">
          {challengeToken
            ? 'Enter the code from your authenticator or one recovery code.'
            : 'Sign in to manage this server.'}
        </p>

        <div className="mt-8 space-y-4">
          {!challengeToken ? (
            <>
              <AuthInput
                label="Username"
                autoComplete="username"
                value={username}
                onChange={setUsername}
              />
              <AuthInput
                label="Password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={setPassword}
              />
            </>
          ) : (
            <AuthInput
              label="Authentication code"
              autoComplete="one-time-code"
              value={code}
              onChange={setCode}
            />
          )}
        </div>

        {error && <p role="alert" className="mt-4 text-sm text-rose-300">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="mt-7 w-full rounded-xl bg-cyan-300 px-5 py-3 font-semibold text-[#071525] transition hover:bg-cyan-200 disabled:opacity-50"
        >
          {submitting ? 'Checking…' : challengeToken ? 'Verify' : 'Sign in'}
        </button>
      </form>
    </AuthSurface>
  )
}

export function AuthSurface({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden bg-[#071525] p-6 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(44,210,255,0.18),transparent_32%),radial-gradient(circle_at_75%_65%,rgba(153,92,255,0.2),transparent_35%)]" />
      <div className="relative flex w-full max-w-5xl justify-center rounded-[2rem] border border-white/10 bg-[#071525]/80 px-7 py-12 shadow-2xl backdrop-blur-xl md:px-14">
        {children}
      </div>
    </main>
  )
}

export function AuthInput({
  autoComplete,
  label,
  onBlur,
  onChange,
  type = 'text',
  value,
}: {
  autoComplete?: string
  label: string
  onBlur?: () => void
  onChange: (value: string) => void
  type?: string
  value: string
}) {
  return <GlassInput label={label} autoComplete={autoComplete} type={type} value={value} onBlur={onBlur} onChange={(event) => onChange(event.target.value)} required />
}
