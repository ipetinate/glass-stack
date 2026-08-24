import type { AuthIdentity } from '../../api/auth'

export function resolveAvatarImage(identity: AuthIdentity): string | undefined {
  if (identity.avatarUrl && !identity.avatarUrl.includes('/images/avatars/')) {
    return identity.avatarUrl
  }
  if (identity.avatarPresetId && identity.avatarPresetId !== 'placeholder') {
    return '/images/onboarding/avatar.png'
  }
  if (identity.avatarPresetId === 'placeholder') {
    return '/images/user-placeholder.webp'
  }
  return undefined
}

export function identityInitials(identity: AuthIdentity): string {
  const name = identity.displayName || identity.username
  return name.slice(0, 2).toUpperCase()
}

export function identityLabel(identity: AuthIdentity): string {
  return identity.displayName || identity.username
}
