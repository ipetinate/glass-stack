import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Copy, KeyRound, ShieldCheck, Trash2, UserPlus, Users } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router'

import { AccordionCard } from '@/core/components/ui/AccordionCard'
import { Input, Select } from '@/core/components/form'
import {
  authKeys,
  beginUserTOTP,
  changePassword,
  changeUserRole,
  createInvitation,
  createUser,
  deleteUser,
  getSession,
  listUsers,
  type AuthUser,
} from '@/modules/auth/api/auth'
import {
  PasswordSafetyStatus,
  usePasswordSafety,
} from '@/modules/auth/components/PasswordSafety'
import { GlassAPIError } from '@/lib/glass-api'
import { SettingsSection } from '@/modules/settings/components/SettingsSection/SettingsSection'

export function SecuritySettings() {
  const session = useQuery({ queryKey: authKeys.session, queryFn: getSession })

  return (
    <div className="grid gap-12 lg:grid-cols-2">
      <PasswordSection />
      {session.data?.user.role === 'admin' ? <InvitationSection /> : null}
      {session.data?.user.role === 'admin' ? <NewUserSection currentUser={session.data.user} /> : null}
      {session.data?.user.role === 'admin' ? (
        <UsersSection currentUser={session.data.user} />
      ) : null}
    </div>
  )
}

function PasswordSection() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [message, setMessage] = useState('')
  const passwordSafety = usePasswordSafety(newPassword)
  const mutation = useMutation({
    mutationFn: changePassword,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: authKeys.session })
      navigate('/login', { replace: true })
    },
    onError: (error) => setMessage(errorMessage(error)),
  })

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setMessage('')
    if (Array.from(newPassword.normalize('NFC')).length < 8 || newPassword !== confirmation) {
      setMessage('The new password must have at least 8 characters and both values must match.')
      return
    }
    const assessment = await passwordSafety.check()
    if (!assessment) {
      return
    }
    if (assessment?.status === 'compromised') {
      setMessage(
        'This password appears in known data breaches. Choose a different password.',
      )
      return
    }
    mutation.mutate({ currentPassword, newPassword })
  }

  return (
    <SettingsSection title="Password">
      <AccordionCard
        icon={<KeyRound size={20} />}
        title="Change password"
        description="Changing your password signs out every active session."
        variant="warning"
      >
        <form onSubmit={submit} className="grid gap-3">
          <Input label="Current password" type="password" placeholder="Current password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required autoComplete="current-password" />
          <Input label="New password" type="password" placeholder="New password" value={newPassword} onBlur={() => void passwordSafety.check()} onChange={(event) => setNewPassword(event.target.value)} required autoComplete="new-password" />
          <Input label="Confirm new password" type="password" placeholder="Confirm new password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required autoComplete="new-password" />
          <PasswordSafetyStatus
            assessment={passwordSafety.assessment}
            className="opacity-75"
          />
          {message && <StatusMessage>{message}</StatusMessage>}
          <ActionButton
            disabled={
              mutation.isPending ||
              passwordSafety.isChecking ||
              passwordSafety.isCompromised
            }
          >
            {mutation.isPending
              ? 'Updating…'
              : passwordSafety.isChecking
                ? 'Checking…'
                : 'Update password'}
          </ActionButton>
        </form>
      </AccordionCard>
    </SettingsSection>
  )
}

function InvitationSection() {
  const [role, setRole] = useState<AuthUser['role']>('viewer')
  const [invitationURL, setInvitationURL] = useState('')
  const [message, setMessage] = useState('')
  const mutation = useMutation({
    mutationFn: createInvitation,
    onSuccess: ({ token }) => {
      const url = new URL('/invite', window.location.origin)
      url.searchParams.set('token', token)
      setInvitationURL(url.toString())
    },
    onError: (error) => setMessage(errorMessage(error)),
  })

  return (
    <SettingsSection title="Invite a user">
      <AccordionCard
        icon={<UserPlus size={20} />}
        title="Invite a user"
        description="Invitation links expire after 24 hours and can be used once."
        variant="info"
      >
        <div className="grid gap-3">
          <Select
            label="Role"
            value={role}
            onValueChange={(next) => setRole(String(next) as AuthUser['role'])}
            options={[{ value: 'viewer', label: 'Viewer' }, { value: 'operator', label: 'Operator' }, { value: 'admin', label: 'Administrator' }]}
          />
          <ActionButton
            disabled={mutation.isPending}
            onClick={() => {
              setMessage('')
              setInvitationURL('')
              mutation.mutate(role)
            }}
          >
            {mutation.isPending ? 'Creating…' : 'Create invitation'}
          </ActionButton>
          {invitationURL && (
            <div className="mt-2 rounded-xl bg-black/10 p-4 dark:bg-black/25">
              <p className="break-all text-sm">{invitationURL}</p>
              <button
                type="button"
                onClick={() => void navigator.clipboard.writeText(invitationURL)}
                className="mt-3 flex items-center gap-2 text-sm text-sky-700 dark:text-cyan-200"
              >
                <Copy size={15} /> Copy invitation link
              </button>
            </div>
          )}
          {message && <StatusMessage>{message}</StatusMessage>}
        </div>
      </AccordionCard>
    </SettingsSection>
  )
}

function NewUserSection({ currentUser }: { currentUser: AuthUser }) {
  const queryClient = useQueryClient()
  const [role, setRole] = useState<AuthUser['role']>('viewer')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [enrollment, setEnrollment] = useState<Awaited<ReturnType<typeof beginUserTOTP>> | null>(null)
  const [totpCode, setTOTPCode] = useState('')
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])
  const [message, setMessage] = useState('')
  const mutation = useMutation({
    mutationFn: () =>
      createUser({
        username,
        password,
        role,
        challengeToken: enrollment?.challengeToken,
        totpCode: role === 'admin' ? totpCode : undefined,
      }),
    onError: (error) => setMessage(errorMessage(error)),
  })

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setMessage('')
    setRecoveryCodes([])
    if (Array.from(password.normalize('NFC')).length < 8 || password !== confirmation) {
      setMessage('The password must have at least 8 characters and both values must match.')
      return
    }
    if (role === 'admin' && !enrollment) {
      try {
        setEnrollment(await beginUserTOTP(username))
      } catch (error) {
        setMessage(errorMessage(error))
      }
      return
    }
    const result = await mutation.mutateAsync()
    if (result.recoveryCodes.length > 0) {
      setRecoveryCodes(result.recoveryCodes)
    } else {
      setMessage('')
      setUsername('')
      setPassword('')
      setConfirmation('')
      setRole('viewer')
      setEnrollment(null)
      setTOTPCode('')
      await queryClient.invalidateQueries({ queryKey: ['auth', 'users'] })
    }
  }

  const copyCodes = () => void navigator.clipboard.writeText(recoveryCodes.join('\n'))

  return (
    <SettingsSection title="New user">
      <AccordionCard
        icon={<UserPlus size={20} />}
        title="Create a user"
        description="Create an account directly with a username and password."
        variant="warning"
      >
        {recoveryCodes.length > 0 ? (
          <div>
            <ShieldCheck size={28} className="text-violet-500 dark:text-violet-300" />
            <p className="mt-3 text-sm font-semibold">
              This user has their own recovery codes
            </p>
            <p className="mt-1 text-sm opacity-65">
              {currentUser.username} must store these codes in a safe place. They will not be shown again.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-black/10 p-4 font-mono text-sm dark:bg-black/25">
              {recoveryCodes.map((code) => <span key={code}>{code}</span>)}
            </div>
            <div className="mt-3 flex gap-3">
              <button
                type="button"
                onClick={copyCodes}
                className="flex items-center gap-2 text-sm text-sky-700 dark:text-cyan-200"
              >
                <Copy size={15} /> Copy codes
              </button>
              <button
                type="button"
                onClick={() => {
                  setRecoveryCodes([])
                  setUsername('')
                  setPassword('')
                  setConfirmation('')
                  setRole('viewer')
                  setEnrollment(null)
                  setTOTPCode('')
                  setMessage('')
                  void queryClient.invalidateQueries({ queryKey: ['auth', 'users'] })
                }}
                className="text-sm text-sky-700 dark:text-cyan-200"
              >
                Create another user
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="grid gap-3">
            <Select
              label="Role"
              value={role}
              onValueChange={(next) => setRole(String(next) as AuthUser['role'])}
              options={[{ value: 'viewer', label: 'Viewer' }, { value: 'operator', label: 'Operator' }, { value: 'admin', label: 'Administrator' }]}
            />
            {!enrollment ? (
              <>
                <Input label="Username" placeholder="Choose a username" value={username} onChange={(event) => setUsername(event.target.value)} required autoComplete="off" />
                <Input label="Password" type="password" placeholder="Enter a strong password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="new-password" />
                <Input label="Confirm password" type="password" placeholder="Re-enter the password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required autoComplete="new-password" />
              </>
            ) : (
              <div>
                <p className="text-sm opacity-70">
                  Administrator accounts require 2FA. Scan the QR code below, then enter the six-digit code to finish creating the user.
                </p>
                <div className="mt-4 flex items-start gap-4">
                  <img
                    src={enrollment.qrCodeDataUri}
                    alt="TOTP enrollment QR code"
                    className="size-36 rounded-xl bg-white p-2"
                  />
                  <div>
                    <code className="block break-all rounded-lg bg-black/10 p-2 text-xs dark:bg-black/25">
                      {enrollment.secret}
                    </code>
                    <Input
                      label="Authentication code"
                      placeholder="6-digit code"
                      value={totpCode}
                      onChange={(event) => setTOTPCode(event.target.value)}
                      className="mt-2"
                    />
                  </div>
                </div>
              </div>
            )}
            {message && <StatusMessage>{message}</StatusMessage>}
            <ActionButton
              disabled={
                mutation.isPending ||
                !username ||
                !password ||
                (Boolean(enrollment) && totpCode.length !== 6)
              }
              onClick={!enrollment && role === 'admin' ? submit : undefined}
            >
              {mutation.isPending
                ? 'Creating…'
                : enrollment
                  ? 'Verify and create user'
                  : role === 'admin'
                    ? 'Configure 2FA'
                    : 'Create user'}
            </ActionButton>
          </form>
        )}
      </AccordionCard>
    </SettingsSection>
  )
}

function UsersSection({ currentUser }: { currentUser: AuthUser }) {
  const queryClient = useQueryClient()
  const [message, setMessage] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<AuthUser | null>(null)
  const [confirmation, setConfirmation] = useState('')
  const users = useQuery({
    queryKey: ['auth', 'users'],
    queryFn: listUsers,
  })
  const mutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: AuthUser['role'] }) =>
      changeUserRole(userId, role),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['auth', 'users'] }),
    onError: (error) => setMessage(errorMessage(error)),
  })
  const deleteMutation = useMutation({
    mutationFn: (userId: string) => deleteUser(userId),
    onSuccess: () => {
      setDeleteTarget(null)
      setConfirmation('')
      queryClient.invalidateQueries({ queryKey: ['auth', 'users'] })
    },
    onError: (error) => setMessage(errorMessage(error)),
  })

  const adminCount = users.data?.users.filter((user) => user.role === 'admin').length ?? 0
  const isLastAdmin = (user: AuthUser) =>
    user.role === 'admin' && adminCount <= 1

  const confirmDelete = () => {
    if (!deleteTarget || confirmation !== deleteTarget.username) {
      return
    }
    deleteMutation.mutate(deleteTarget.id)
  }

  return (
    <SettingsSection title="Users">
      <AccordionCard
        icon={<Users size={20} />}
        title="Users"
        description="Role changes revoke the affected user’s active sessions."
        variant="violet"
      >
        <div className="divide-y divide-black/10 dark:divide-white/10">
          {users.data?.users.map((user) => (
            <div key={user.id}>
              <div className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
                <div>
                  <p className="font-medium">{user.username}</p>
                  <p className="text-xs opacity-50">{user.status}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    aria-label={`Role for ${user.username}`}
                    value={user.role}
                    disabled={user.id === currentUser.id || mutation.isPending}
                    onValueChange={(next) => {
                      setMessage('')
                      mutation.mutate({
                        userId: user.id,
                        role: String(next) as AuthUser['role'],
                      })
                    }}
                    options={[{ value: 'viewer', label: 'Viewer' }, { value: 'operator', label: 'Operator' }, { value: 'admin', label: 'Administrator' }]}
                    containerClassName="w-full max-w-xs"
                  />
                  <button
                    type="button"
                    aria-label={`Delete user ${user.username}`}
                    disabled={
                      user.id === currentUser.id ||
                      isLastAdmin(user) ||
                      deleteMutation.isPending
                    }
                    onClick={() => {
                      setMessage('')
                      setDeleteTarget(user)
                      setConfirmation('')
                    }}
                    className="rounded-lg p-2 text-black/40 transition hover:bg-rose-500/10 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-30 dark:text-white/40 dark:hover:text-rose-300"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              {deleteTarget?.id === user.id ? (
                <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/5 p-4">
                  <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">
                    Delete {user.username}?
                  </p>
                  <p className="mt-1 text-sm opacity-70">
                    This permanently removes the account, its sessions, 2FA and
                    recovery codes. Type{' '}
                    <span className="font-mono font-semibold">{user.username}</span>{' '}
                    to confirm.
                  </p>
                  <Input
                    label={`Type ${user.username} to confirm`}
                    placeholder={user.username}
                    value={confirmation}
                    onChange={(event) => setConfirmation(event.target.value)}
                    className="mt-3"
                  />
                  <div className="mt-3 flex gap-3">
                    <button
                      type="button"
                      disabled={
                        confirmation !== user.username || deleteMutation.isPending
                      }
                      onClick={confirmDelete}
                      className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                    >
                      {deleteMutation.isPending ? 'Deleting…' : 'Delete user'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteTarget(null)
                        setConfirmation('')
                      }}
                      className="rounded-lg px-4 py-2 text-sm opacity-70 hover:opacity-100"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </div>
        {users.isError && <StatusMessage>{errorMessage(users.error)}</StatusMessage>}
        {message && <StatusMessage>{message}</StatusMessage>}
      </AccordionCard>
    </SettingsSection>
  )
}

function ActionButton({
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
      className="mt-5 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40 dark:bg-cyan-300 dark:text-[#071525]"
    >
      {children}
    </button>
  )
}

function StatusMessage({ children }: { children: React.ReactNode }) {
  return <p role="status" className="mt-4 text-sm text-rose-600 dark:text-rose-300">{children}</p>
}

function errorMessage(error: unknown) {
  return error instanceof GlassAPIError ? error.message : 'The request could not be completed.'
}
