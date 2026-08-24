import { useEffect, useRef, useState } from 'react'

import { ComponentErrorBoundary } from '@/core/components/structure/ComponentErrorBoundary'
import { Avatar } from '@/core/components/ui/Avatar'
import { useAppStore } from '@/core/stores/app'
import { useLockStore } from '@/core/stores/lock'
import { useStatusbarStore } from '@/core/stores/statusbar'
import { BackgroundBlur } from '@/core/components/ui/BackgroundBlur'
import { Clock } from '@/core/components/ui/Clock'
import { Weather, useWeatherStore } from '@/lib/weather'
import { useClickOutside } from '@/core/hooks/useClickOutside'

import { AvatarDropdownContent } from './AvatarDropdownContent'
import { ClockDropdownContent } from './ClockDropdownContent'
import type { StatusbarDropdown } from './Statusbar.types'
import { StatusbarDropdownTrigger } from './StatusbarDropdownTrigger'
import { WeatherDropdownContent } from './WeatherDropdownContent'

export function Statusbar() {
  const statusbarRef = useRef<HTMLDivElement>(null)
  const [activeDropdown, setActiveDropdown] = useState<StatusbarDropdown>(null)
  const clockVariant = useStatusbarStore((state) => state.clockVariant)
  const hourVariant = useStatusbarStore((state) => state.hourVariant)
  const showDate = useStatusbarStore((state) => state.showDate)
  const showWeekday = useStatusbarStore((state) => state.showWeekday)
  const showMonth = useStatusbarStore((state) => state.showMonth)
  const showYear = useStatusbarStore((state) => state.showYear)
  useClickOutside(
    () => setActiveDropdown(null),
    {
      enabled: activeDropdown !== null,
      refs: [statusbarRef],
      isInside: (target) =>
        target instanceof Element &&
        Boolean(target.closest('[data-statusbar-popover="true"]')),
    },
  )
  const showWeatherCondition = useWeatherStore((state) => state.showCondition)
  const showWeatherGreeting = useWeatherStore((state) => state.showGreeting)
  const showWeatherIcon = useWeatherStore((state) => state.showIcon)
  const user = useAppStore((state) => state.user)
  const locked = useLockStore((state) => state.locked)

  useEffect(() => {
    if (locked) setActiveDropdown(null)
  }, [locked])

  const toggleDropdown = (dropdown: StatusbarDropdown) => {
    setActiveDropdown((currentDropdown) =>
      currentDropdown === dropdown ? null : dropdown,
    )
  }

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
        dropdown={<ClockDropdownContent />}
      >
        <Clock
          className="min-w-64"
          dateClassName="whitespace-nowrap"
          showDate={showDate}
          showWeekday={showWeekday}
          showMonth={showMonth}
          showYear={showYear}
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
        dropdown={
          <AvatarDropdownContent onClose={() => setActiveDropdown(null)} />
        }
      >
      <div>
          {user?.avatarUrl || user?.avatarPresetId ? (
            <Avatar
              size="md"
              image={resolveAvatarImage(user.avatarUrl, user.avatarPresetId)}
            />
          ) : (
            <Avatar size="md" initials={user?.username.slice(0, 2).toUpperCase() ?? 'GS'} />
          )}
      </div>
      </StatusbarDropdownTrigger>
    </BackgroundBlur>
  )
}

function avatarPresetImage(presetId?: string) {
  if (presetId === 'placeholder') return '/images/user-placeholder.webp'
  return '/images/onboarding/avatar.png'
}

function resolveAvatarImage(avatarUrl?: string, presetId?: string) {
  if (avatarUrl && !avatarUrl.includes('/images/avatars/')) return avatarUrl
  return avatarPresetImage(presetId)
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
