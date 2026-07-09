import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { WeatherLocation } from './weather.types'

export type WeatherMode = 'geolocation' | 'manual'

type WeatherDisplayOption = 'showCondition' | 'showGreeting' | 'showIcon'

type WeatherState = {
  mode: WeatherMode
  selectedLocation?: WeatherLocation
  showCondition: boolean
  showGreeting: boolean
  showIcon: boolean
  setDisplayOption: (option: WeatherDisplayOption, value: boolean) => void
  setManualLocation: (location: WeatherLocation) => void
  useGeolocation: () => void
}

export const useWeatherStore = create<WeatherState>()(
  persist(
    (set) => ({
      mode: 'geolocation',
      showCondition: true,
      showGreeting: true,
      showIcon: true,
      setDisplayOption: (option, value) => {
        set({ [option]: value })
      },
      setManualLocation: (location) => {
        set({ mode: 'manual', selectedLocation: location })
      },
      useGeolocation: () => {
        set({ mode: 'geolocation', selectedLocation: undefined })
      },
    }),
    {
      name: 'weather-preferences',
      partialize: (state) => ({
        mode: state.mode,
        selectedLocation: state.selectedLocation,
        showCondition: state.showCondition,
        showGreeting: state.showGreeting,
        showIcon: state.showIcon,
      }),
    },
  ),
)
