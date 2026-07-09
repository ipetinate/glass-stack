import { describe, expect, it } from 'vitest'

import { getGaugeTicks, getGaugeValueAngle } from './InvertedGauge.functions'

describe('InvertedGauge functions', () => {
  it('generates gauge ticks with major ticks', () => {
    const ticks = getGaugeTicks({
      ticks: 4,
      majorTickEvery: 2,
      centerX: 50,
      centerY: 50,
      radius: 40,
      tickLength: 4,
      majorTickLength: 8,
      startAngle: 180,
      endAngle: 360,
    })

    expect(ticks).toHaveLength(5)
    expect(ticks.filter((tick) => tick.major)).toHaveLength(3)
  })

  it('maps gauge values into angles', () => {
    expect(getGaugeValueAngle(50, 0, 100, 235, 485)).toBe(360)
  })
})
