import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ClockVariant = 'HH:mm' | 'HH:mm:ss'
export type HourVariant = '12' | '24'

type StatusbarState = {
  clockVariant: ClockVariant
  hourVariant: HourVariant
  showDate: boolean
  showWeekday: boolean
  showMonth: boolean
  showYear: boolean
  setClockVariant: (variant: ClockVariant) => void
  setHourVariant: (variant: HourVariant) => void
  setShowDate: (show: boolean) => void
  setShowWeekday: (show: boolean) => void
  setShowMonth: (show: boolean) => void
  setShowYear: (show: boolean) => void
}

export const useStatusbarStore = create<StatusbarState>()(
  persist(
    (set) => ({
      clockVariant: 'HH:mm:ss',
      hourVariant: '24',
      showDate: true,
      showWeekday: true,
      showMonth: true,
      showYear: true,
      setClockVariant: (clockVariant) => set({ clockVariant }),
      setHourVariant: (hourVariant) => set({ hourVariant }),
      setShowDate: (showDate) => set({ showDate }),
      setShowWeekday: (showWeekday) => set({ showWeekday }),
      setShowMonth: (showMonth) => set({ showMonth }),
      setShowYear: (showYear) => set({ showYear }),
    }),
    {
      name: 'statusbar-preferences',
      partialize: (state) => ({
        clockVariant: state.clockVariant,
        hourVariant: state.hourVariant,
        showDate: state.showDate,
        showWeekday: state.showWeekday,
        showMonth: state.showMonth,
        showYear: state.showYear,
      }),
    },
  ),
)
