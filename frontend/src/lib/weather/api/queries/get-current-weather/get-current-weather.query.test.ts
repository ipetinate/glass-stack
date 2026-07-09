import { describe, expect, it, vi } from 'vitest'

import { getWeatherCondition } from './get-current-weather.functions'
import { getCurrentWeatherQuery } from './get-current-weather.query'

describe('getCurrentWeatherQuery', () => {
  it('loads and maps current weather from Open-Meteo', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        current: {
          is_day: 1,
          temperature_2m: 23.4,
          weather_code: 0,
        },
        current_units: {
          temperature_2m: '°C',
        },
      }),
    })

    vi.stubGlobal('fetch', fetchMock)

    const weather = await getCurrentWeatherQuery({
      latitude: -23.55,
      longitude: -46.63,
    })
    const url = fetchMock.mock.calls[0][0] as URL

    expect(url.hostname).toBe('api.open-meteo.com')
    expect(url.searchParams.get('latitude')).toBe('-23.55')
    expect(url.searchParams.get('current')).toBe(
      'temperature_2m,weather_code,is_day',
    )
    expect(weather).toEqual({
      condition: 'Sunny',
      isDay: true,
      temperature: 23.4,
      temperatureUnit: '°C',
      weatherCode: 0,
    })
  })

  it('maps weather codes into readable conditions', () => {
    expect(getWeatherCondition(0)).toBe('Sunny')
    expect(getWeatherCondition(3)).toBe('Cloudy')
    expect(getWeatherCondition(61)).toBe('Rainy')
    expect(getWeatherCondition(95)).toBe('Stormy')
  })
})
