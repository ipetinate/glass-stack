import { openMeteoConfig } from '@/lib/weather/weather.constants'
import type {
  OpenMeteoGeocodingResponse,
  WeatherLocation,
} from '@/lib/weather/weather.types'

export async function searchWeatherLocationQuery(
  search: string,
): Promise<WeatherLocation[]> {
  const url = new URL(openMeteoConfig.geocodingUrl)

  url.searchParams.set('name', search.trim())
  url.searchParams.set('count', '8')
  url.searchParams.set('language', 'en')
  url.searchParams.set('format', 'json')

  const response = await fetch(url)

  if (!response.ok) {
    throw new Error('Unable to search weather locations.')
  }

  const data = (await response.json()) as OpenMeteoGeocodingResponse

  return (
    data.results?.map((location) => ({
      id: location.id,
      name: location.name,
      country: location.country,
      admin1: location.admin1,
      latitude: location.latitude,
      longitude: location.longitude,
      timezone: location.timezone,
    })) ?? []
  )
}
