import { arc } from 'd3'

import { getValueAngle, polarToCartesian } from '@/core/functions/charts'
import type { ChartColor, ChartGradient } from '../types'

export type GaugeTick = {
  angle: number
  inner: {
    x: number
    y: number
  }
  outer: {
    x: number
    y: number
  }
  major: boolean
}

export type GaugeTickConfig = {
  ticks: number
  majorTickEvery: number
  centerX: number
  centerY: number
  radius: number
  tickLength: number
  majorTickLength: number
  startAngle: number
  endAngle: number
}

export function getGaugeTicks({
  ticks,
  majorTickEvery,
  centerX,
  centerY,
  radius,
  tickLength,
  majorTickLength,
  startAngle,
  endAngle,
}: GaugeTickConfig): GaugeTick[] {
  return Array.from({ length: ticks + 1 }, (_, index) => {
    const angle = startAngle + ((endAngle - startAngle) * index) / ticks
    const major = index % majorTickEvery === 0
    const currentTickLength = major ? majorTickLength : tickLength

    const inner = polarToCartesian(
      centerX,
      centerY,
      radius - currentTickLength,
      angle,
    )

    const outer = polarToCartesian(centerX, centerY, radius, angle)

    return {
      angle,
      inner,
      outer,
      major,
    }
  })
}

export function getGaugeArcPath({
  innerRadius,
  outerRadius,
  startAngle,
  endAngle,
}: {
  innerRadius: number
  outerRadius: number
  startAngle: number
  endAngle: number
}) {
  const generator = arc<unknown>()
    .innerRadius(innerRadius)
    .outerRadius(outerRadius)
    .cornerRadius((outerRadius - innerRadius) / 2)
    .padAngle(0)

  return (
    generator({
      startAngle: (startAngle * Math.PI) / 180,
      endAngle: (endAngle * Math.PI) / 180,
    }) ?? ''
  )
}

export function getGaugeValueAngle(
  value: number,
  min: number,
  max: number,
  startAngle: number,
  endAngle: number,
) {
  return getValueAngle(value, min, max, startAngle, endAngle)
}

/** Resolves the indicator color from the gauge gradient at the current value. */
export function getGaugeIndicatorColor(
  indicatorColor: string | 'value',
  color: ChartColor,
  value: number,
  min: number,
  max: number,
) {
  if (indicatorColor !== 'value' || typeof color === 'string') {
    return indicatorColor === 'value' ? '#ffffff' : indicatorColor
  }

  return interpolateGradientColor(color, (value - min) / (max - min))
}

function interpolateGradientColor(gradient: ChartGradient, progress: number) {
  const stops = gradient.stops
    .map((stop) => ({
      ...stop,
      position: Number.parseFloat(stop.offset) / 100,
    }))
    .sort((a, b) => a.position - b.position)
  if (stops.length === 0) return '#ffffff'

  const clamped = Math.max(0, Math.min(1, progress))
  const upperIndex = stops.findIndex((stop) => stop.position >= clamped)
  if (upperIndex <= 0) return stops[0].color
  if (upperIndex === -1) return stops.at(-1)?.color ?? '#ffffff'

  const lower = stops[upperIndex - 1]
  const upper = stops[upperIndex]
  const ratio =
    (clamped - lower.position) / (upper.position - lower.position || 1)
  const lowerRGB = parseHexColor(lower.color)
  const upperRGB = parseHexColor(upper.color)
  if (!lowerRGB || !upperRGB) return upper.color

  return `rgb(${Math.round(lowerRGB[0] + (upperRGB[0] - lowerRGB[0]) * ratio)}, ${Math.round(
    lowerRGB[1] + (upperRGB[1] - lowerRGB[1]) * ratio,
  )}, ${Math.round(lowerRGB[2] + (upperRGB[2] - lowerRGB[2]) * ratio)})`
}

function parseHexColor(color: string): [number, number, number] | null {
  const normalized = color.replace('#', '')
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return null
  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16),
  ]
}
