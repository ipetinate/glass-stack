import { MapPinOff } from 'lucide-react'
import type { ElementType } from 'react'
import { useEffect, useState } from 'react'

import { cn } from '@/core/functions/class-name'

import { useGetCurrentWeather } from '../../repositories'
import { useWeatherStore } from '../../weather.store'
import type { WeatherCoordinates } from '../../weather.types'
import {
  formatWeatherTemperature,
  getWeatherGreeting,
  getWeatherIcon,
} from './Weather.functions'

type WeatherStatus = 'blocked' | 'loading' | 'ready'

export type WeatherProps = {
  showCondition?: boolean
  showGreeting?: boolean
  showIcon?: boolean
}

export function Weather(props: WeatherProps) {
  const mode = useWeatherStore((state) => state.mode)
  const selectedLocation = useWeatherStore((state) => state.selectedLocation)
  const storeShowCondition = useWeatherStore((state) => state.showCondition)
  const storeShowGreeting = useWeatherStore((state) => state.showGreeting)
  const storeShowIcon = useWeatherStore((state) => state.showIcon)
  const showCondition = props.showCondition ?? storeShowCondition
  const showGreeting = props.showGreeting ?? storeShowGreeting
  const showIcon = props.showIcon ?? storeShowIcon
  const [coordinates, setCoordinates] = useState<WeatherCoordinates | null>(
    mode === 'manual' && selectedLocation
      ? {
          latitude: selectedLocation.latitude,
          longitude: selectedLocation.longitude,
        }
      : null,
  )
  const [status, setStatus] = useState<WeatherStatus>(
    mode === 'manual' && selectedLocation ? 'ready' : 'loading',
  )
  const weatherQuery = useGetCurrentWeather(coordinates)

  useEffect(() => {
    if (mode === 'manual') {
      if (!selectedLocation) {
        setCoordinates(null)
        setStatus('blocked')
        return
      }

      setCoordinates({
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
      })
      setStatus('ready')
      return
    }

    if (!navigator.geolocation) {
      setStatus('blocked')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoordinates({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })
        setStatus('ready')
      },
      () => {
        setStatus('blocked')
      },
      {
        enableHighAccuracy: false,
        maximumAge: 10 * 60 * 1000,
        timeout: 5000,
      },
    )
  }, [mode, selectedLocation])

  if (status === 'blocked') {
    return (
      <WeatherShell
        icon={MapPinOff}
        label="Weather unavailable"
        detail="Allow location"
        showIcon={showIcon}
      />
    )
  }

  if (status === 'loading' || weatherQuery.isPending) {
    return (
      <WeatherShell
        icon={getWeatherIcon(0)}
        label="Loading weather"
        detail="One moment"
        showIcon={showIcon}
      />
    )
  }

  if (weatherQuery.isError || !weatherQuery.data) {
    return (
      <WeatherShell
        icon={MapPinOff}
        label="Weather unavailable"
        detail="Try again later"
        showIcon={showIcon}
      />
    )
  }

  const Icon = getWeatherIcon(weatherQuery.data.weatherCode)

  return (
    <WeatherShell
      icon={Icon}
      label={[
        formatWeatherTemperature(
          weatherQuery.data.temperature,
          weatherQuery.data.temperatureUnit,
        ),
        showCondition ? weatherQuery.data.condition : null,
      ]
        .filter(Boolean)
        .join(' ')}
      detail={showGreeting ? getWeatherGreeting() : undefined}
      showIcon={showIcon}
    />
  )
}

function WeatherShell({
  detail,
  icon: Icon,
  label,
  showIcon,
}: {
  detail?: string
  icon: ElementType
  label: string
  showIcon: boolean
}) {
  return (
    <div className="flex w-full max-w-[18rem] min-w-0 items-center gap-3 text-[#151A21] dark:text-white">
      {showIcon && (
        <Icon
          aria-hidden="true"
          className={cn(
            'size-14 stroke-1 shrink-0',
            label.includes('unavailable')
              ? 'text-[#151A21]/55 dark:text-white/65'
              : 'text-[#F7FF66]',
          )}
        />
      )}

      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-2xl font-light">{label}</p>

        {detail && (
          <p className="truncate text-lg font-extralight text-[#151A21]/70 dark:text-white/70">
            {detail}
          </p>
        )}
      </div>
    </div>
  )
}
