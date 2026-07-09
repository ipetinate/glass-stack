export type WeatherCoordinates = {
  latitude: number
  longitude: number
}

export type WeatherLocation = WeatherCoordinates & {
  id: number
  name: string
  country: string
  admin1?: string
  timezone?: string
}

export type CurrentWeather = {
  condition: string
  temperature: number
  temperatureUnit: string
  weatherCode: number
  isDay: boolean
}

export type OpenMeteoCurrentWeatherResponse = {
  current: {
    temperature_2m: number
    weather_code: number
    is_day: number
  }
  current_units: {
    temperature_2m: string
  }
}

export type OpenMeteoGeocodingLocation = {
  id: number
  name: string
  latitude: number
  longitude: number
  country: string
  admin1?: string
  timezone?: string
}

export type OpenMeteoGeocodingResponse = {
  results?: OpenMeteoGeocodingLocation[]
}
