import { useCallback, useEffect, useState } from 'react'

import { cn } from '@/core/functions/class-name'

type ClockVariant = 'HH:mm' | 'HH:mm:ss'
type DayVariant = 'short' | 'long'
type DateFormat = 'compact' | 'long'
type HourVariant = '12' | '24'

export type ClockProps = {
  className?: string
  dateClassName?: string
  dateFormat?: DateFormat
  variant?: ClockVariant
  hourVariant?: HourVariant
  showDate?: boolean
  showWeekday?: boolean
  showMonth?: boolean
  showYear?: boolean
  dayVariant?: DayVariant
  timeClassName?: string
}

export function Clock({
  className = '',
  dateClassName = '',
  dateFormat = 'long',
  variant = 'HH:mm',
  showDate: showDay = false,
  showWeekday = true,
  showMonth = true,
  showYear = true,
  dayVariant = 'long',
  hourVariant = '12',
  timeClassName = '',
}: ClockProps) {
  const getTime = useCallback(
    (date: Date) =>
      date.toLocaleTimeString(undefined, {
        hour12: hourVariant === '12',
        hour: '2-digit',
        minute: '2-digit',
        ...(variant === 'HH:mm:ss' ? { second: '2-digit' } : {}),
      }),
    [hourVariant, variant],
  )

  const getDate = useCallback(
    (date: Date) => {
      const options: Intl.DateTimeFormatOptions = { day: 'numeric' }
      if (dateFormat === 'compact') {
        if (showWeekday) options.weekday = dayVariant
        if (showMonth) options.month = 'short'
        if (showYear) options.year = 'numeric'
      } else {
        if (showWeekday) options.weekday = dayVariant
        if (showMonth) options.month = 'long'
        if (showYear) options.year = 'numeric'
      }
      return date.toLocaleDateString(undefined, options)
    },
    [dateFormat, dayVariant, showMonth, showWeekday, showYear],
  )

  const getClockState = useCallback(() => {
    const currentDate = new Date()

    return {
      date: getDate(currentDate),
      time: getTime(currentDate),
    }
  }, [getDate, getTime])

  const [clock, setClock] = useState(getClockState)
  const [, time, period] = /^(.+)\s(AM|PM)$/.exec(clock.time) ?? []

  useEffect(() => {
    setClock(getClockState())
  }, [getClockState])

  useEffect(() => {
    const interval = setInterval(() => {
      setClock(getClockState())
    }, 1000)

    return () => clearInterval(interval)
  }, [getClockState])

  return (
    <div className={className}>
      <p
        className={cn(
          'text-5xl font-extralight leading-none text-[#151A21] dark:text-white',
          timeClassName,
        )}
      >
        {period ? (
          <>
            {time}{' '}
            <span className="ml-1 align-baseline text-[0.5em]">{period}</span>
          </>
        ) : (
          clock.time
        )}
      </p>

      {showDay && (
        <p
          className={cn(
            'text-xl font-extralight text-[#151A21]/70 dark:text-white/70',
            dateClassName,
          )}
        >
          {clock.date}
        </p>
      )}
    </div>
  )
}
