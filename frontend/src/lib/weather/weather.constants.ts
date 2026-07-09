export const openMeteoConfig = {
  apiUrl: 'https://api.open-meteo.com/v1/forecast',
  geocodingUrl: 'https://geocoding-api.open-meteo.com/v1/search',
}

export const weatherQueryKeys = {
  current: (latitude: number, longitude: number) => [
    'weather',
    'current',
    latitude,
    longitude,
  ],
  searchLocation: (search: string) => [
    'weather',
    'location-search',
    search.trim().toLowerCase(),
  ],
}
