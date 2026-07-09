import { render, screen } from '@testing-library/react'
import { act } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Clock } from './Clock'

const clockWithMinutesPattern = /\d{1,2}:\d{2} (AM|PM)/
const clockWithSecondsPattern = /\d{1,2}:\d{2}:\d{2} (AM|PM)/
const clockWithTwentyFourHourMinutesPattern = /\d{2}:\d{2}/
const clockWithTwentyFourHourSecondsPattern = /\d{2}:\d{2}:\d{2}/

const fixedDate = new Date('2026-07-06T16:00:00')

function setFixedSystemTime(date = fixedDate) {
  vi.useFakeTimers()
  vi.setSystemTime(date)
}

function getClockText(pattern: RegExp) {
  return screen.getByText((_, element) => {
    if (element?.tagName !== 'P') return false

    const text = element?.textContent?.replace(/\s+/g, ' ').trim()

    return Boolean(text && pattern.test(text))
  })
}

describe('Clock', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('displays the current time', () => {
    setFixedSystemTime()

    render(<Clock />)

    expect(getClockText(clockWithMinutesPattern)).toBeInTheDocument()
  })

  it('updates the time every second when seconds are visible', () => {
    setFixedSystemTime()

    render(<Clock variant="HH:mm:ss" />)

    const initialTime = getClockText(clockWithSecondsPattern).textContent

    vi.setSystemTime(new Date('2026-07-06T16:00:01'))
    act(() => {
      vi.advanceTimersByTime(1000)
    })

    const updatedTime = getClockText(clockWithSecondsPattern).textContent

    expect(initialTime).not.toBe(updatedTime)
  })

  it('clears the interval on unmount', () => {
    setFixedSystemTime()
    const { unmount } = render(<Clock />)

    const global = window as unknown as { clearInterval: (id: number) => void }

    const clearIntervalSpy = vi.spyOn(global, 'clearInterval')

    unmount()

    expect(clearIntervalSpy).toHaveBeenCalled()
  })

  it('show clock with seconds', () => {
    setFixedSystemTime()

    render(<Clock variant="HH:mm:ss" />)

    const clockElement = getClockText(clockWithSecondsPattern)

    expect(clockElement).toBeInTheDocument()
  })

  it('renders a 24-hour clock without an AM or PM suffix', () => {
    setFixedSystemTime()

    render(<Clock hourVariant="24" />)

    const clockElement = screen.getByText(clockWithTwentyFourHourMinutesPattern)

    expect(clockElement).toHaveTextContent('16:00')
    expect(clockElement).not.toHaveTextContent(/AM|PM/)
  })

  it('renders a 24-hour clock with seconds', () => {
    setFixedSystemTime()

    render(<Clock hourVariant="24" variant="HH:mm:ss" />)

    expect(screen.getByText(clockWithTwentyFourHourSecondsPattern)).toHaveTextContent(
      '16:00:00',
    )
  })

  it('renders the current date when enabled', () => {
    setFixedSystemTime()

    render(<Clock showDate />)

    expect(
      screen.getByText(
        fixedDate.toLocaleDateString(undefined, {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
      ),
    ).toBeInTheDocument()
  })

  it('uses theme-aligned text colors', () => {
    setFixedSystemTime()

    render(<Clock showDate />)

    expect(getClockText(clockWithMinutesPattern)).toHaveClass(
      'text-[#151A21]',
      'dark:text-white',
    )
    expect(
      screen.getByText(
        fixedDate.toLocaleDateString(undefined, {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
      ),
    ).toHaveClass('text-[#151A21]/70', 'dark:text-white/70')
  })

  it('renders the short weekday variant', () => {
    setFixedSystemTime()

    render(<Clock showDate dayVariant="short" />)

    expect(
      screen.getByText(
        fixedDate.toLocaleDateString(undefined, {
          weekday: 'short',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
      ),
    ).toBeInTheDocument()
  })

  it('renders a compact date format', () => {
    setFixedSystemTime()

    render(<Clock showDate dateFormat="compact" dayVariant="short" />)

    expect(
      screen.getByText(
        fixedDate.toLocaleDateString(undefined, {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        }),
      ),
    ).toBeInTheDocument()
  })

  it('does not render the date by default', () => {
    setFixedSystemTime()

    render(<Clock />)

    expect(
      screen.queryByText(
        fixedDate.toLocaleDateString(undefined, {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
      ),
    ).not.toBeInTheDocument()
  })

  it('updates immediately when the time variant changes', () => {
    setFixedSystemTime()

    const { rerender } = render(<Clock />)

    expect(getClockText(clockWithMinutesPattern)).toBeInTheDocument()

    rerender(<Clock variant="HH:mm:ss" />)

    expect(getClockText(clockWithSecondsPattern)).toBeInTheDocument()
  })

  it('updates immediately when the hour variant changes', () => {
    setFixedSystemTime()

    const { rerender } = render(<Clock />)

    expect(getClockText(clockWithMinutesPattern)).toBeInTheDocument()

    rerender(<Clock hourVariant="24" />)

    expect(screen.getByText(clockWithTwentyFourHourMinutesPattern)).toHaveTextContent(
      '16:00',
    )
  })

  it('updates the date while the clock ticks', () => {
    setFixedSystemTime(new Date('2026-07-06T23:59:59'))

    render(<Clock showDate variant="HH:mm:ss" />)

    expect(
      screen.getByText(
        new Date('2026-07-06T23:59:59').toLocaleDateString(undefined, {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
      ),
    ).toBeInTheDocument()

    vi.setSystemTime(new Date('2026-07-07T00:00:00'))
    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(
      screen.getByText(
        new Date('2026-07-07T00:00:00').toLocaleDateString(undefined, {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
      ),
    ).toBeInTheDocument()
  })
})
