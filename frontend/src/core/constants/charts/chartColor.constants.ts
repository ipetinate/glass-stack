import type { ChartColor } from '@/core/components/charts/types'

export const CHART_COLORS = {
  iceBlue: '#bfefff',
  electricBlue: '#1db8ff',
  trackNavy: '#28415f',
  mint: '#55f2b2',
  violet: '#aa78ff',
  amber: '#ffd166',
  coral: '#ff6f91',
  cyan: '#64d8ff',
  text: '#ffffff',
  mutedText: '#a9b3bd',
} as const

export const DEFAULT_CHART_GRADIENT: ChartColor = {
  type: 'linear',
  x1: '0%',
  x2: '100%',
  y1: '0%',
  y2: '0%',
  stops: [
    { offset: '0%', color: CHART_COLORS.iceBlue },
    { offset: '100%', color: CHART_COLORS.electricBlue },
  ],
}
