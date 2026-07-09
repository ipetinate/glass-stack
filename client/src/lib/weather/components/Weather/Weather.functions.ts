import {
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Sun,
  type LucideIcon,
} from 'lucide-react'

export function getWeatherGreeting(date = new Date()) {
  const hour = date.getHours()

  if (hour < 5) return 'Good night'
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'

  return 'Good evening'
}

export function getWeatherIcon(weatherCode: number): LucideIcon {
  if (weatherCode === 0) return Sun
  if ([1, 2].includes(weatherCode)) return CloudSun
  if (weatherCode === 3) return Cloud
  if ([45, 48].includes(weatherCode)) return CloudFog
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(weatherCode)) {
    return CloudRain
  }
  if ([71, 73, 75, 77, 85, 86].includes(weatherCode)) return CloudSnow
  if ([95, 96, 99].includes(weatherCode)) return CloudLightning

  return Sun
}

export function formatWeatherTemperature(temperature: number, unit: string) {
  const normalizedUnit = unit === '°C' ? 'º' : unit

  return `${Math.round(temperature)}${normalizedUnit}`
}
