import type { ClockVariant, HourVariant } from './Statusbar.types'
import { Checkbox, SegmentedControl } from '@/core/components/form'

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
      <Checkbox
        label="Show seconds"
        checked={clockVariant === 'HH:mm:ss'}
        onChange={(event) => setClockVariant(event.target.checked ? 'HH:mm:ss' : 'HH:mm')}
        className="justify-between"
      />
      <Checkbox
        label="Show date"
        checked={showDate}
        onChange={(event) => setShowDate(event.target.checked)}
        className="justify-between"
      />
      <SegmentedControl
        aria-label="Hour format"
        options={[{ value: '12', label: '12h' }, { value: '24', label: '24h' }]}
        value={hourVariant}
        onValueChange={setHourVariant}
        size="lg"
        className="flex w-full [&>span]:flex-1 [&_label]:text-center"
      />
    </div>
  )
}
