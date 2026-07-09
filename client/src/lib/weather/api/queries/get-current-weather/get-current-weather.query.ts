import { openMeteoConfig } from '@/lib/weather/weather.constants'
import type {
  CurrentWeather,
  OpenMeteoCurrentWeatherResponse,
  WeatherCoordinates,
} from '@/lib/weather/weather.types'
import { getWeatherCondition } from './get-current-weather.functions'

export async function getCurrentWeatherQuery({
  latitude,
  longitude,
}: WeatherCoordinates): Promise<CurrentWeather> {
  const url = new URL(openMeteoConfig.apiUrl)

  url.searchParams.set('latitude', String(latitude))
  url.searchParams.set('longitude', String(longitude))
  url.searchParams.set('current', 'temperature_2m,weather_code,is_day')
  url.searchParams.set('temperature_unit', 'celsius')
  url.searchParams.set('timezone', 'auto')

  const response = await fetch(url)

  if (!response.ok) {
    throw new Error('Unable to load current weather.')
  }

  const data = (await response.json()) as OpenMeteoCurrentWeatherResponse

  return {
    condition: getWeatherCondition(data.current.weather_code),
    temperature: data.current.temperature_2m,
    temperatureUnit: data.current_units.temperature_2m,
    weatherCode: data.current.weather_code,
    isDay: data.current.is_day === 1,
  }
}
