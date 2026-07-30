import { describe, expect, it } from 'vitest'

import type { ChartColor } from '@/core/components/charts/types'
import {
  getChartPaint,
  getGradientId,
  isChartGradient,
  renderGradientDefinition,
} from './chartColor.functions'

describe('chart color functions', () => {
  it('normalizes solid paint and gradient paint', () => {
    const gradient: ChartColor = {
      type: 'linear',
      stops: [{ offset: '0%', color: '#fff' }],
    }

    expect(isChartGradient('#fff')).toBe(false)
    expect(isChartGradient(gradient)).toBe(true)
    expect(getChartPaint('#fff', 'chart-id')).toBe('#fff')
    expect(getChartPaint(gradient, 'chart-id')).toBe('url(#chart-id)')
  })

  it('creates stable svg-safe gradient ids', () => {
    expect(getGradientId('chart', ':r1:')).toBe('chart-r1')
  })

  it('renders no defs for solid colors', () => {
    expect(renderGradientDefinition('#fff', 'chart-id')).toBeNull()
  })
})
