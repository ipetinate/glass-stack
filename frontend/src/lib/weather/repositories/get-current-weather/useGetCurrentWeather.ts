import { useQuery } from '@tanstack/react-query'

import { getCurrentWeatherQuery } from '../../api'
import { weatherQueryKeys } from '../../weather.constants'
import type { WeatherCoordinates } from '../../weather.types'

export function useGetCurrentWeather(coordinates: WeatherCoordinates | null) {
  return useQuery({
    enabled: Boolean(coordinates),
    queryKey: coordinates
      ? weatherQueryKeys.current(coordinates.latitude, coordinates.longitude)
      : ['weather', 'current', 'missing-coordinates'],
    queryFn: () => {
      if (!coordinates) {
        throw new Error('Weather coordinates are not available.')
      }

      return getCurrentWeatherQuery(coordinates)
    },
  })
}
