import { describe, expect, it } from 'vitest'

import {
  getGaugeIndicatorColor,
  getGaugeTicks,
  getGaugeValueAngle,
} from './InvertedGauge.functions'

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

  it('interpolates the indicator color from the gauge gradient', () => {
    const gradient = {
      type: 'linear' as const,
      stops: [
        { offset: '0%', color: '#ffffff' },
        { offset: '100%', color: '#ff0000' },
      ],
    }

    expect(getGaugeIndicatorColor('value', gradient, 50, 0, 100)).toBe(
      'rgb(255, 128, 128)',
    )
    expect(getGaugeIndicatorColor('#fff', gradient, 50, 0, 100)).toBe('#fff')
  })
})
