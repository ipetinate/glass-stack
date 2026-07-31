import { Clock3 } from 'lucide-react'
import { DatePicker, type DatePickerProps } from '../DatePicker/DatePicker'
export type HourPickerProps = Omit<DatePickerProps, 'range'> & { step?: number }
export function HourPicker({ label = 'Horário', ...props }: HourPickerProps) { return <div className="relative"><Clock3 className="pointer-events-none absolute left-3 top-[2.65rem] z-10 size-4 opacity-60" /><DatePicker {...props} label={label} className="[&_input]:pl-9" /></div> }
