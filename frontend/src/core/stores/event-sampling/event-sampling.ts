import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type EventSamplingInterval = 1 | 2 | 3 | 4 | 5

type EventSamplingState = {
  intervalSeconds: EventSamplingInterval
  setIntervalSeconds: (intervalSeconds: EventSamplingInterval) => void
}

export const useEventSamplingStore = create<EventSamplingState>()(
  persist(
    (set) => ({
      intervalSeconds: 1,
      setIntervalSeconds: (intervalSeconds) => set({ intervalSeconds }),
    }),
    {
      name: 'event-sampling',
      partialize: (state) => ({ intervalSeconds: state.intervalSeconds }),
    },
  ),
)
