import type { ReactNode } from 'react'

import type { ChartColor, ChartGradient } from '../types'

export function isChartGradient(color: ChartColor): color is ChartGradient {
  return typeof color !== 'string'
}

export function getGradientId(prefix: string, id: string) {
  return `${prefix}-${id.replace(/:/g, '')}`
}

export function getChartPaint(color: ChartColor, gradientId: string) {
  return isChartGradient(color) ? `url(#${gradientId})` : color
}

export function renderGradientDefinition(
  color: ChartColor,
  gradientId: string,
): ReactNode {
  if (!isChartGradient(color)) return null

  if (color.type === 'radial') {
    return (
      <radialGradient
        id={gradientId}
        cx={color.cx ?? '50%'}
        cy={color.cy ?? '50%'}
        r={color.r ?? '50%'}
      >
        {color.stops.map((stop) => (
          <stop
            key={`${gradientId}-${stop.offset}-${stop.color}`}
            offset={stop.offset}
            stopColor={stop.color}
            stopOpacity={stop.opacity}
          />
        ))}
      </radialGradient>
    )
  }

  return (
    <linearGradient
      id={gradientId}
      x1={color.x1 ?? '0%'}
      x2={color.x2 ?? '100%'}
      y1={color.y1 ?? '0%'}
      y2={color.y2 ?? '0%'}
    >
      {color.stops.map((stop) => (
        <stop
          key={`${gradientId}-${stop.offset}-${stop.color}`}
          offset={stop.offset}
          stopColor={stop.color}
          stopOpacity={stop.opacity}
        />
      ))}
    </linearGradient>
  )
}
