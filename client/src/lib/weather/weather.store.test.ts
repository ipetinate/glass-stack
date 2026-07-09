import { describe, expect, it } from 'vitest'

import { useWeatherStore } from './weather.store'

const location = {
  admin1: 'São Paulo',
  country: 'Brazil',
  id: 3448439,
  latitude: -23.55,
  longitude: -46.64,
  name: 'São Paulo',
  timezone: 'America/Sao_Paulo',
}

describe('useWeatherStore', () => {
  it('stores manual locations and returns to geolocation mode', () => {
    useWeatherStore.getState().setManualLocation(location)

    expect(useWeatherStore.getState()).toMatchObject({
      mode: 'manual',
      selectedLocation: location,
    })

    useWeatherStore.getState().useGeolocation()

    expect(useWeatherStore.getState()).toMatchObject({
      mode: 'geolocation',
      selectedLocation: undefined,
    })
  })

  it('persists display options in the store state', () => {
    useWeatherStore.getState().setDisplayOption('showIcon', false)
    useWeatherStore.getState().setDisplayOption('showCondition', false)
    useWeatherStore.getState().setDisplayOption('showGreeting', false)

    expect(useWeatherStore.getState()).toMatchObject({
      showCondition: false,
      showGreeting: false,
      showIcon: false,
    })
  })
})
