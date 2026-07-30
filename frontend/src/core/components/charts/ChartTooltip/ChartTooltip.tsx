import { forwardRef, type CSSProperties, type PointerEventHandler } from 'react'
import { createPortal } from 'react-dom'

import { cn } from '@/core/functions/class-name'

export type ChartTooltipProps = {
  title?: string
  value: string
  subtitle?: string
  valueColor?: string
  compact?: boolean
  className?: string
  testId?: string
  portal?: boolean
  interactive?: boolean
  onPointerEnter?: PointerEventHandler<HTMLDivElement>
  onPointerLeave?: PointerEventHandler<HTMLDivElement>
  style?: CSSProperties
}

export const ChartTooltip = forwardRef<HTMLDivElement, ChartTooltipProps>(function ChartTooltip({
  title,
  value,
  subtitle,
  valueColor,
  compact = false,
  className,
  testId,
  portal = false,
  interactive = false,
  onPointerEnter,
  onPointerLeave,
  style,
}, ref) {
  const tooltip = (
    <div
      className={cn(
        'z-[100] rounded-xl border border-white/30 bg-white/20 text-[#151a21] shadow-2xl backdrop-blur-2xl backdrop-saturate-150 dark:border-white/15 dark:bg-[#0b1626]/55 dark:text-white',
        interactive ? 'pointer-events-auto' : 'pointer-events-none',
        compact ? 'rounded-md px-2 py-1 text-[10px] font-medium tabular-nums' : 'w-52 rounded-2xl p-4',
        className,
      )}
      ref={ref}
      data-testid={testId}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      style={style}
    >
      {title ? <p className={cn(compact ? 'sr-only' : 'text-sm font-semibold leading-tight')}>{title}</p> : null}
      {subtitle ? <p className="mt-1 whitespace-nowrap text-white/70">{subtitle}</p> : null}
      {compact ? value : value ? (
        <div className="mt-4 flex justify-end">
          <span
            className="rounded-xl px-3 py-1.5 text-lg font-bold text-white shadow-lg"
            style={{
              backgroundColor: valueColor ?? '#52e6ff',
              color: getContrastColor(valueColor ?? '#52e6ff'),
            }}
          >
            {value}
          </span>
        </div>
      ) : null}
    </div>
  )

  return portal && typeof document !== 'undefined'
    ? createPortal(tooltip, document.body)
    : tooltip
})

function getContrastColor(color: string) {
  const match = color.match(/#([0-9a-f]{6})|rgb\((\d+),\s*(\d+),\s*(\d+)\)/i)
  if (!match) return '#ffffff'
  const channels = match[1]
    ? [0, 2, 4].map((index) => Number.parseInt(match[1].slice(index, index + 2), 16))
    : [match[2], match[3], match[4]].map(Number)
  const luminance = (0.299 * channels[0] + 0.587 * channels[1] + 0.114 * channels[2]) / 255
  return luminance > 0.68 ? '#172033' : '#ffffff'
}
