import { arc } from 'd3'

import { getValueAngle, polarToCartesian } from '../functions'

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
