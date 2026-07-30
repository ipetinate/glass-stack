import { glassRequest } from '@/lib/glass-api'
import type { SetupPreferences } from '@/modules/auth/api/auth'

export type PreferenceRecord = {
  userId: string
  revision: number
  preferences: SetupPreferences
  updatedAt: string
}

export type WallpaperRecord = {
  id: string
  mediaAssetId?: string
  source: 'unsplash' | 'upload' | 'preset' | 'solid' | 'gradient'
  providerId?: string
  title: string
  description: string
  authorName?: string
  authorUrl?: string
  sourceUrl?: string
  downloadLocation?: string
  metadata: Record<string, unknown>
}

export const preferenceKeys = {
  current: ['preferences', 'current'] as const,
}

export const getPreferences = () =>
  glassRequest<PreferenceRecord>('/api/v1/users/me/preferences')

export const updatePreferences = (
  revision: number,
  preferences: SetupPreferences,
) =>
  glassRequest<PreferenceRecord>('/api/v1/users/me/preferences', {
    method: 'PATCH',
    body: JSON.stringify({ revision, preferences }),
  })

export const getWallpaper = (wallpaperId: string) =>
  glassRequest<{
    wallpaper: WallpaperRecord
    asset: { id: string } | null
  }>(`/api/v1/wallpapers/${encodeURIComponent(wallpaperId)}`)

export const saveUnsplashWallpaper = (providerId: string) =>
  glassRequest<WallpaperRecord>('/api/v1/wallpapers/unsplash', {
    method: 'POST',
    body: JSON.stringify({ providerId }),
  })

export const uploadWallpaper = (file: File) => {
  const body = new FormData()
  body.set('wallpaper', file)
  return glassRequest<WallpaperRecord>('/api/v1/wallpapers/uploads', {
    method: 'POST',
    body,
  })
}
