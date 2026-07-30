import { useQueryClient } from '@tanstack/react-query'
import { Check, Copy, ShieldCheck, UserPlus } from 'lucide-react'
import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'

import { GlassAPIError } from '@/lib/glass-api'
import {
  PasswordSafetyStatus,
  usePasswordSafety,
} from '@/modules/auth/components/PasswordSafety'

import {
  acceptInvitation,
  authKeys,
  beginInvitationTOTP,
  getInvitationStatus,
  type AuthUser,
  type SetupPreferences,
} from '../api/auth'
import { AuthInput, AuthSurface } from './LoginPage'

type Enrollment = Awaited<ReturnType<typeof beginInvitationTOTP>>

export function InvitationPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [role, setRole] = useState<AuthUser['role'] | null>(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null)
  const [totpCode, setTOTPCode] = useState('')
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!token) {
      setError('The invitation link is incomplete.')
      return
    }
    void getInvitationStatus(token)
      .then((result) => setRole(result.role))
      .catch((requestError) => setError(errorMessage(requestError)))
  }, [token])

  const passwordValid = useMemo(
    () => Array.from(password.normalize('NFC')).length >= 15,
    [password],
  )
  const passwordSafety = usePasswordSafety(password)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    if (!role || !passwordValid || password !== confirmation) {
      setError('Use at least 15 characters and make sure both passwords match.')
      return
    }
    if (!enrollment) {
      const assessment = await passwordSafety.check()
      if (!assessment) {
        return
      }
      if (assessment?.status === 'compromised') {
        setError(
          'This password appears in known data breaches. Choose a different password.',
        )
        return
      }
    }
    setSubmitting(true)
    try {
      if (role === 'admin' && !enrollment) {
        setEnrollment(
          await beginInvitationTOTP({
            invitationToken: token,
            username,
          }),
        )
        return
      }
      const result = await acceptInvitation({
        invitationToken: token,
        challengeToken: enrollment?.challengeToken,
        username,
        password,
        totpCode: role === 'admin' ? totpCode : undefined,
        preferences: defaultPreferences(),
      })
      setRecoveryCodes(result.recoveryCodes)
      await queryClient.invalidateQueries({ queryKey: authKeys.session })
      if (result.recoveryCodes.length === 0) {
        navigate('/', { replace: true })
      }
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setSubmitting(false)
    }
  }

  const finish = () => navigate('/', { replace: true })

  return (
    <AuthSurface>
      <div className="w-full max-w-xl">
        {recoveryCodes.length > 0 ? (
          <div>
            <ShieldCheck size={38} className="text-emerald-300" />
            <h1 className="mt-5 text-4xl font-light">Save your recovery codes</h1>
            <p className="mt-3 text-white/55">
              Each code can be used once and will not be displayed again.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-black/20 p-5 font-mono text-sm">
              {recoveryCodes.map((code) => <span key={code}>{code}</span>)}
            </div>
            <button
              type="button"
              onClick={() => void navigator.clipboard.writeText(recoveryCodes.join('\n'))}
              className="mt-4 flex items-center gap-2 text-sm text-cyan-200"
            >
              <Copy size={16} /> Copy codes
            </button>
            <PrimaryButton onClick={finish}>Open GlassStack</PrimaryButton>
          </div>
        ) : (
          <form onSubmit={submit}>
            <UserPlus size={38} className="text-cyan-200" />
            <p className="mt-5 text-sm font-semibold uppercase tracking-[0.22em] text-cyan-200/70">
              GlassStack invitation
            </p>
            <h1 className="mt-3 text-4xl font-light">
              {enrollment ? 'Protect your administrator account' : 'Create your account'}
            </h1>
            <p className="mt-3 text-white/55">
              {role ? `This invitation grants the ${role} role.` : 'Validating invitation…'}
            </p>

            {!enrollment ? (
              <>
                <div className="mt-8 space-y-4">
                  <AuthInput label="Username" value={username} onChange={setUsername} autoComplete="username" />
                  <AuthInput label="Password" type="password" value={password} onBlur={() => void passwordSafety.check()} onChange={setPassword} autoComplete="new-password" />
                  <AuthInput label="Confirm password" type="password" value={confirmation} onChange={setConfirmation} autoComplete="new-password" />
                </div>
                <div className="mt-4 space-y-2 text-sm text-white/55">
                  <ValidationLine valid={passwordValid}>At least 15 characters</ValidationLine>
                  <PasswordSafetyStatus assessment={passwordSafety.assessment} className="text-white/55" />
                  <ValidationLine valid={password === confirmation && password !== ''}>Passwords match</ValidationLine>
                </div>
              </>
            ) : (
              <div className="mt-7 grid gap-6 sm:grid-cols-[auto_1fr]">
                <img
                  src={enrollment.qrCodeDataUri}
                  alt="TOTP enrollment QR code"
                  className="size-44 rounded-xl bg-white p-2"
                />
                <div>
                  <p className="text-sm text-white/55">
                    Scan the QR code, then enter the six-digit code.
                  </p>
                  <code className="mt-3 block break-all rounded-lg bg-black/25 p-3 text-xs text-cyan-100">
                    {enrollment.secret}
                  </code>
                  <div className="mt-4">
                    <AuthInput label="Authentication code" value={totpCode} onChange={setTOTPCode} autoComplete="one-time-code" />
                  </div>
                </div>
              </div>
            )}

            {error && <p role="alert" className="mt-4 text-sm text-rose-300">{error}</p>}
            <PrimaryButton
              disabled={
                submitting ||
                !role ||
                !username ||
                !password ||
                passwordSafety.isChecking ||
                passwordSafety.isCompromised ||
                (Boolean(enrollment) && totpCode.length !== 6)
              }
            >
              {submitting ? 'Creating account…' : enrollment ? 'Verify and create account' : role === 'admin' ? 'Configure 2FA' : 'Create account'}
            </PrimaryButton>
          </form>
        )}
      </div>
    </AuthSurface>
  )
}

function defaultPreferences(): SetupPreferences {
  return {
    schemaVersion: 1,
    locale: 'en-US',
    theme: 'system',
    avatarPresetId: 'default',
    windowAppearance: {
      backgroundMode: 'solid',
      actionVisibility: {
        close: true,
        maximize: true,
        verticalExpand: true,
      },
    },
    eventSamplingSeconds: 1,
    dashboard: { version: 1 },
  }
}

function PrimaryButton({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode
  disabled?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type={onClick ? 'button' : 'submit'}
      onClick={onClick}
      disabled={disabled}
      className="mt-7 w-full rounded-xl bg-cyan-300 px-5 py-3 font-semibold text-[#071525] transition hover:bg-cyan-200 disabled:opacity-40"
    >
      {children}
    </button>
  )
}

function ValidationLine({ children, valid }: { children: React.ReactNode; valid: boolean }) {
  return <p className={valid ? 'text-emerald-300' : ''}><Check className="mr-2 inline" size={15} />{children}</p>
}

function errorMessage(error: unknown) {
  return error instanceof GlassAPIError
    ? error.message
    : 'The invitation could not be completed.'
}
