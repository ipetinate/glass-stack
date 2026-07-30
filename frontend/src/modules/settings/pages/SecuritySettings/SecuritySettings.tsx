import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Copy, KeyRound, UserPlus, Users } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router'

import { GlassInput } from '@/core/components/form'
import {
  authKeys,
  changePassword,
  changeUserRole,
  createInvitation,
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
      {session.data?.user.role === 'admin' ? (
        <div className="lg:col-span-2"><UsersSection currentUser={session.data.user} /></div>
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
    if (Array.from(newPassword.normalize('NFC')).length < 15 || newPassword !== confirmation) {
      setMessage('The new password must have at least 15 characters and both values must match.')
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
      <form onSubmit={submit} className="w-full max-w-xl rounded-2xl border border-black/10 bg-white/35 p-5 dark:border-white/10 dark:bg-white/5">
        <div className="mb-5 flex items-center gap-3">
          <KeyRound size={20} />
          <p className="text-sm opacity-65">Changing your password signs out every active session.</p>
        </div>
        <div className="grid gap-3">
          <GlassInput label="Current password" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required autoComplete="current-password" />
          <GlassInput label="New password" type="password" value={newPassword} onBlur={() => void passwordSafety.check()} onChange={(event) => setNewPassword(event.target.value)} required autoComplete="new-password" />
          <GlassInput label="Confirm new password" type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required autoComplete="new-password" />
        </div>
        <PasswordSafetyStatus
          assessment={passwordSafety.assessment}
          className="mt-3 text-sm opacity-75"
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
      <div className="w-full max-w-xl rounded-2xl border border-black/10 bg-white/35 p-5 dark:border-white/10 dark:bg-white/5">
        <div className="flex items-center gap-3">
          <UserPlus size={20} />
          <p className="text-sm opacity-65">Invitation links expire after 24 hours and can be used once.</p>
        </div>
        <label className="mt-5 block text-sm">
          Role
          <select
            value={role}
            onChange={(event) => setRole(event.target.value as AuthUser['role'])}
            className="mt-2 w-full rounded-xl border border-black/10 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-black/25"
          >
            <option value="viewer">Viewer</option>
            <option value="operator">Operator</option>
            <option value="admin">Administrator</option>
          </select>
        </label>
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
          <div className="mt-4 rounded-xl bg-black/10 p-4 dark:bg-black/25">
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
    </SettingsSection>
  )
}

function UsersSection({ currentUser }: { currentUser: AuthUser }) {
  const queryClient = useQueryClient()
  const [message, setMessage] = useState('')
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

  return (
    <SettingsSection title="Users">
      <div className="w-full rounded-2xl border border-black/10 bg-white/35 p-5 dark:border-white/10 dark:bg-white/5">
        <div className="mb-4 flex items-center gap-3">
          <Users size={20} />
          <p className="text-sm opacity-65">Role changes revoke the affected user’s active sessions.</p>
        </div>
        <div className="divide-y divide-black/10 dark:divide-white/10">
          {users.data?.users.map((user) => (
            <div key={user.id} className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
              <div>
                <p className="font-medium">{user.username}</p>
                <p className="text-xs opacity-50">{user.status}</p>
              </div>
              <select
                aria-label={`Role for ${user.username}`}
                value={user.role}
                disabled={user.id === currentUser.id || mutation.isPending}
                onChange={(event) => {
                  setMessage('')
                  mutation.mutate({
                    userId: user.id,
                    role: event.target.value as AuthUser['role'],
                  })
                }}
                className="rounded-lg border border-black/10 bg-white/70 px-3 py-2 text-sm dark:border-white/10 dark:bg-black/25"
              >
                <option value="viewer">Viewer</option>
                <option value="operator">Operator</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
          ))}
        </div>
        {users.isError && <StatusMessage>{errorMessage(users.error)}</StatusMessage>}
        {message && <StatusMessage>{message}</StatusMessage>}
      </div>
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
