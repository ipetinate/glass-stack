import { glassRequest } from '@/lib/glass-api'
import type { AuthUser, SetupPreferences } from '@/modules/auth/api/auth'

export type Enrollment = {
  challengeToken: string
  secret: string
  uri: string
  qrCodeDataUri: string
}

export const onboardingKeys = {
  setup: ['auth', 'setup'] as const,
  session: ['auth', 'session'] as const,
}

export const beginSetupTOTP = (input: { bootstrapToken: string; username: string }) =>
  glassRequest<Enrollment>('/api/v1/setup/totp', {
    method: 'POST',
    body: JSON.stringify(input),
  })

export const validateSetupToken = (bootstrapToken: string) =>
  glassRequest<{ valid: boolean }>('/api/v1/setup/token/validate', {
    method: 'POST',
    body: JSON.stringify({ bootstrapToken }),
  })

export const completeSetup = (input: {
  bootstrapToken: string
  challengeToken: string
  username: string
  password: string
  totpCode: string
  preferences: SetupPreferences
}) =>
  glassRequest<{ user: AuthUser; csrfToken: string; recoveryCodes: string[] }>(
    '/api/v1/setup/complete',
    { method: 'POST', body: JSON.stringify(input) },
  )
