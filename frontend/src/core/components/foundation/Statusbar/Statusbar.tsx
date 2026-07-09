import { useEffect, useRef, useState } from 'react'

import { ComponentErrorBoundary } from '@/core/components/structure/ComponentErrorBoundary'
import { Avatar } from '@/core/components/ui/Avatar'
import { BackgroundBlur } from '@/core/components/ui/BackgroundBlur'
import { Clock } from '@/core/components/ui/Clock'
import { Weather, useWeatherStore } from '@/lib/weather'

import { AvatarDropdownContent } from './AvatarDropdownContent'
import { ClockDropdownContent } from './ClockDropdownContent'
import type {
  ClockVariant,
  HourVariant,
  StatusbarDropdown,
} from './Statusbar.types'
import { StatusbarDropdownTrigger } from './StatusbarDropdownTrigger'
import { WeatherDropdownContent } from './WeatherDropdownContent'

export function Statusbar() {
  const statusbarRef = useRef<HTMLDivElement>(null)
  const [activeDropdown, setActiveDropdown] = useState<StatusbarDropdown>(null)
  const [clockVariant, setClockVariant] = useState<ClockVariant>('HH:mm:ss')
  const [hourVariant, setHourVariant] = useState<HourVariant>('24')
  const [showDate, setShowDate] = useState(true)
  const showWeatherCondition = useWeatherStore((state) => state.showCondition)
  const showWeatherGreeting = useWeatherStore((state) => state.showGreeting)
  const showWeatherIcon = useWeatherStore((state) => state.showIcon)

  const toggleDropdown = (dropdown: StatusbarDropdown) => {
    setActiveDropdown((currentDropdown) =>
      currentDropdown === dropdown ? null : dropdown,
    )
  }

  useEffect(() => {
    if (!activeDropdown) return

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node

      if (statusbarRef.current?.contains(target)) return
      if (
        target instanceof Element &&
        target.closest('[data-statusbar-popover="true"]')
      )
        return

      setActiveDropdown(null)
    }

    document.addEventListener('pointerdown', handlePointerDown)

    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [activeDropdown])

  return (
    <BackgroundBlur
      elementRef={statusbarRef}
      className="relative z-50 flex w-full flex-row items-center justify-between gap-1 overflow-visible p-6"
    >
      <StatusbarDropdownTrigger
        active={activeDropdown === 'clock'}
        className="shrink-0"
        label="Open clock settings"
        onClick={() => toggleDropdown('clock')}
        dropdown={
          <ClockDropdownContent
            clockVariant={clockVariant}
            hourVariant={hourVariant}
            setClockVariant={setClockVariant}
            setHourVariant={setHourVariant}
            setShowDate={setShowDate}
            showDate={showDate}
          />
        }
      >
        <Clock
          className="min-w-64"
          dateClassName="whitespace-nowrap"
          showDate={showDate}
          timeClassName="whitespace-nowrap tabular-nums"
          variant={clockVariant}
          hourVariant={hourVariant}
        />
      </StatusbarDropdownTrigger>

      <StatusbarDropdownTrigger
        active={activeDropdown === 'weather'}
        className="min-w-0 flex-1"
        label="Open weather settings"
        onClick={() => toggleDropdown('weather')}
        dropdown={<WeatherDropdownContent />}
      >
        <ComponentErrorBoundary fallback={<WeatherStatusFallback />}>
          <Weather
            showCondition={showWeatherCondition}
            showGreeting={showWeatherGreeting}
            showIcon={showWeatherIcon}
          />
        </ComponentErrorBoundary>
      </StatusbarDropdownTrigger>

      <StatusbarDropdownTrigger
        hideIndicator
        active={activeDropdown === 'avatar'}
        align="right"
        className="shrink-0"
        label="Open profile settings"
        onClick={() => toggleDropdown('avatar')}
        dropdown={<AvatarDropdownContent />}
      >
        <Avatar size="md" image="/images/user-placeholder.webp" />
      </StatusbarDropdownTrigger>
    </BackgroundBlur>
  )
}

function WeatherStatusFallback() {
  return (
    <div className="flex w-full max-w-[18rem] min-w-0 flex-col leading-tight text-[#151A21] dark:text-white">
      <p className="truncate text-2xl font-light">Weather unavailable</p>
      <p className="truncate text-lg font-extralight text-[#151A21]/70 dark:text-white/70">
        Check settings
      </p>
    </div>
  )
}
