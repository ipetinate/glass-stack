import { glassRequest } from '@/lib/glass-api'

export type AuthUser = {
  id: string
  username: string
  role: 'admin' | 'operator' | 'viewer'
  status: 'active' | 'disabled'
  displayName?: string
  avatarUrl?: string
  avatarPresetId?: string
}

export type AuthSession = {
  user: AuthUser
  csrfToken: string
  expiresAt: string
}

export type SetupPreferences = {
  schemaVersion: 1
  locale: 'pt-BR' | 'en-US' | 'fr' | 'de'
  theme: 'light' | 'dark' | 'system'
  avatarPresetId: string
  avatarUrl?: string
  displayName?: string
  wallpaperId?: string
  windowAppearance: {
    backgroundMode: 'solid' | 'blur'
    actionVisibility: {
      close: boolean
      maximize: boolean
      verticalExpand: boolean
    }
  }
  eventSamplingSeconds: 1 | 2 | 3 | 4 | 5
  dashboard: { version: 1 }
}

export const authKeys = {
  session: ['auth', 'session'] as const,
  setup: ['auth', 'setup'] as const,
}

export const getSetupStatus = () =>
  glassRequest<{ required: boolean }>('/api/v1/setup/status')

export const getSession = () =>
  glassRequest<AuthSession>('/api/v1/auth/session')

export type PasswordSafetyResult = {
  status: 'safe' | 'compromised' | 'unavailable'
  occurrences?: number
}

export const checkPasswordSafety = (
  password: string,
  signal?: AbortSignal,
) =>
  glassRequest<PasswordSafetyResult>('/api/v1/auth/password/check', {
    method: 'POST',
    body: JSON.stringify({ password }),
    signal,
  })

export const beginSetupTOTP = (input: {
  bootstrapToken: string
  username: string
}) =>
  glassRequest<{
    challengeToken: string
    secret: string
    uri: string
    qrCodeDataUri: string
  }>('/api/v1/setup/totp', {
    method: 'POST',
    body: JSON.stringify(input),
  })

export const completeSetup = (input: {
  bootstrapToken: string
  challengeToken: string
  username: string
  password: string
  totpCode: string
  preferences: SetupPreferences
}) =>
  glassRequest<{
    user: AuthUser
    csrfToken: string
    recoveryCodes: string[]
  }>('/api/v1/setup/complete', {
    method: 'POST',
    body: JSON.stringify(input),
  })

export const login = (input: { username: string; password: string }) =>
  glassRequest<
    | { mfaRequired: true; challengeToken: string }
    | { mfaRequired: false; user: AuthUser; csrfToken: string }
  >('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  })

export const completeLoginMFA = (input: {
  challengeToken: string
  code: string
}) =>
  glassRequest<{ user: AuthUser; csrfToken: string }>('/api/v1/auth/totp', {
    method: 'POST',
    body: JSON.stringify(input),
  })

export const logout = () =>
  glassRequest<void>('/api/v1/auth/logout', { method: 'POST' })

export const getInvitationStatus = (token: string) =>
  glassRequest<{ role: AuthUser['role'] }>(
    `/api/v1/invitations/status?token=${encodeURIComponent(token)}`,
  )

export const beginInvitationTOTP = (input: {
  invitationToken: string
  username: string
}) =>
  glassRequest<{
    challengeToken: string
    secret: string
    uri: string
    qrCodeDataUri: string
  }>('/api/v1/invitations/totp', {
    method: 'POST',
    body: JSON.stringify(input),
  })

export const acceptInvitation = (input: {
  invitationToken: string
  challengeToken?: string
  username: string
  password: string
  totpCode?: string
  preferences: SetupPreferences
}) =>
  glassRequest<{
    user: AuthUser
    csrfToken: string
    recoveryCodes: string[]
  }>('/api/v1/invitations/accept', {
    method: 'POST',
    body: JSON.stringify(input),
  })

export const createInvitation = (role: AuthUser['role']) =>
  glassRequest<{ token: string; expiresIn: string }>('/api/v1/invitations', {
    method: 'POST',
    body: JSON.stringify({ role }),
  })

export const listUsers = () =>
  glassRequest<{ users: AuthUser[] }>('/api/v1/users')

export const changeUserRole = (userId: string, role: AuthUser['role']) =>
  glassRequest<void>(`/api/v1/users/${encodeURIComponent(userId)}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  })

export const changePassword = (input: {
  currentPassword: string
  newPassword: string
}) =>
  glassRequest<void>('/api/v1/auth/password', {
    method: 'PUT',
    body: JSON.stringify(input),
  })
