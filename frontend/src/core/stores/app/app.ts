import { create } from 'zustand'

import type { AuthUser } from '@/modules/auth/api/auth'

export type AppUser = AuthUser & {
  displayName?: string
  avatarUrl?: string
  avatarPresetId?: string
}

type AppState = {
  user: AppUser | null
  setUser: (user: AppUser | null) => void
  clearUser: () => void
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null }),
}))

