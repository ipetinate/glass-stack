import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const DEFAULT_AUTO_LOCK_MINUTES = 15

type LockState = {
  locked: boolean
  rememberedUserId: string | null
  autoLockMinutes: number | null
  selectedUserId: string | null
  lock: () => void
  unlock: () => void
  selectUser: (userId: string) => void
  showUserPicker: () => void
  setRememberedUser: (userId: string | null) => void
  setAutoLockMinutes: (minutes: number | null) => void
  reset: () => void
}

export const useLockStore = create<LockState>()(
  persist(
    (set) => ({
      locked: false,
      rememberedUserId: null,
      autoLockMinutes: DEFAULT_AUTO_LOCK_MINUTES,
      selectedUserId: null,
      lock: () => set({ locked: true, selectedUserId: null }),
      unlock: () => set({ locked: false }),
      selectUser: (userId) => set({ selectedUserId: userId }),
      showUserPicker: () =>
        set({ selectedUserId: null, rememberedUserId: null }),
      setRememberedUser: (userId) => set({ rememberedUserId: userId }),
      setAutoLockMinutes: (minutes) => set({ autoLockMinutes: minutes }),
    reset: () =>
      set({
        locked: false,
        rememberedUserId: null,
        selectedUserId: null,
        autoLockMinutes: DEFAULT_AUTO_LOCK_MINUTES,
      }),
    }),
    {
      name: 'lock',
      partialize: (state) => ({
        locked: state.locked,
        rememberedUserId: state.rememberedUserId,
        autoLockMinutes: state.autoLockMinutes,
      }),
    },
  ),
)
