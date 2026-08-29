import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ReviewProvider = 'github' | 'google'

export type ReviewConnection = {
  provider: ReviewProvider
  login: string
  avatarUrl?: string
}

type ReviewConnectionState = {
  connections: ReviewConnection[]
  getConnection: (provider: ReviewProvider) => ReviewConnection | undefined
  setConnection: (connection: ReviewConnection) => void
  clearConnection: (provider: ReviewProvider) => void
  clearAll: () => void
}

export const useReviewConnectionStore = create<ReviewConnectionState>()(
  persist(
    (set, get) => ({
      connections: [],

      getConnection: (provider) =>
        get().connections.find((c) => c.provider === provider),

      setConnection: (connection) =>
        set((state) => ({
          connections: [
            ...state.connections.filter((c) => c.provider !== connection.provider),
            connection,
          ],
        })),

      clearConnection: (provider) =>
        set((state) => ({
          connections: state.connections.filter((c) => c.provider !== provider),
        })),

      clearAll: () => set({ connections: [] }),
    }),
    {
      name: 'review-connection',
      partialize: (state) => ({ connections: state.connections }),
    },
  ),
)
