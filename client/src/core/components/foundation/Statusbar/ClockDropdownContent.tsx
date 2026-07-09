import type { ClockVariant, HourVariant } from './Statusbar.types'

type ClockDropdownContentProps = {
  clockVariant: ClockVariant
  hourVariant: HourVariant
  setClockVariant: (variant: ClockVariant) => void
  setHourVariant: (variant: HourVariant) => void
  setShowDate: (showDate: boolean) => void
  showDate: boolean
}

export function ClockDropdownContent({
  clockVariant,
  hourVariant,
  setClockVariant,
  setHourVariant,
  setShowDate,
  showDate,
}: ClockDropdownContentProps) {
  return (
    <div className="flex flex-col gap-3 text-sm">
      <p className="text-base font-semibold">Clock</p>
      <label className="flex items-center justify-between gap-4">
        Show seconds
        <input
          type="checkbox"
          checked={clockVariant === 'HH:mm:ss'}
          onChange={(event) =>
            setClockVariant(event.target.checked ? 'HH:mm:ss' : 'HH:mm')
          }
        />
      </label>
      <label className="flex items-center justify-between gap-4">
        Show date
        <input
          type="checkbox"
          checked={showDate}
          onChange={(event) => setShowDate(event.target.checked)}
        />
      </label>
      <div className="grid grid-cols-2 gap-2">
        {(['12', '24'] as const).map((variant) => (
          <button
            key={variant}
            type="button"
            onClick={() => setHourVariant(variant)}
            className={[
              'rounded-lg border px-3 py-2 font-semibold transition-colors',
              hourVariant === variant
                ? 'border-sky-400 bg-sky-400/15'
                : 'border-black/10 bg-white/40 dark:border-white/10 dark:bg-white/5',
            ].join(' ')}
          >
            {variant}h
          </button>
        ))}
      </div>
    </div>
  )
}
