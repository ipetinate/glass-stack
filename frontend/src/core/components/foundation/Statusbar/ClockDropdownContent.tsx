import { Checkbox, SegmentedControl } from '@/core/components/form'
import { useStatusbarStore } from '@/core/stores/statusbar'

export function ClockDropdownContent() {
  const {
    clockVariant,
    hourVariant,
    showDate,
    showWeekday,
    showMonth,
    showYear,
    setClockVariant,
    setHourVariant,
    setShowDate,
    setShowWeekday,
    setShowMonth,
    setShowYear,
  } = useStatusbarStore()

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
      <Checkbox
        label="Show weekday"
        checked={showWeekday}
        onChange={(event) => setShowWeekday(event.target.checked)}
        className="justify-between"
      />
      <Checkbox
        label="Show month"
        checked={showMonth}
        onChange={(event) => setShowMonth(event.target.checked)}
        className="justify-between"
      />
      <Checkbox
        label="Show year"
        checked={showYear}
        onChange={(event) => setShowYear(event.target.checked)}
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
