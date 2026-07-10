import { arc } from 'd3'
import { useId } from 'react'

import { cn } from '@/core/functions/class-name'

import { CHART_COLORS, DEFAULT_CHART_GRADIENT } from '../constants'
import {
  getChartPaint,
  getGradientId,
  getValueAngle,
  polarToCartesian,
  renderGradientDefinition,
  useAnimatedNumber,
} from '../functions'
import type { ChartAnimation, ChartColor } from '../types'

export type RadialDonutProps = {
  /** Current chart value. Values outside 0..max are clamped visually. */
  value: number
  max?: number
  size?: number
  thickness?: number
  gap?: number
  startAngle?: number
  endAngle?: number
  color?: ChartColor
  trackColor?: ChartColor
  trackVariant?: 'disk' | 'ring'
  centerDot?: boolean
  centerDotRadius?: number
  centerDotColor?: string
  centerDotRingColor?: string
  striped?: boolean
  stripeColor?: string
  stripeBaseColor?: string
  roundedCaps?: boolean
  showIndicator?: boolean
  indicatorRadius?: number
  indicatorColor?: string
  animation?: ChartAnimation
  ariaLabel?: string
  className?: string
}

const DEFAULT_SIZE = 100
const DEFAULT_THICKNESS = 32
const DEFAULT_MAX = 100
const FULL_CIRCLE_START_ANGLE = 0
const FULL_CIRCLE_END_ANGLE = 360
const STRIPE_PATTERN_SIZE = 24
const STRIPE_WIDTH = 11
const DEFAULT_RADIAL_TRACK_GRADIENT: ChartColor = {
  type: 'radial',
  cx: '32%',
  cy: '28%',
  r: '72%',
  stops: [
    { offset: '0%', color: '#3f6184' },
    { offset: '100%', color: CHART_COLORS.trackNavy },
  ],
}

export function RadialDonut({
  value,
  max = DEFAULT_MAX,
  size = DEFAULT_SIZE,
  thickness = DEFAULT_THICKNESS,
  gap = 0,
  startAngle = FULL_CIRCLE_START_ANGLE,
  endAngle = FULL_CIRCLE_END_ANGLE,
  color = DEFAULT_CHART_GRADIENT,
  trackColor = DEFAULT_RADIAL_TRACK_GRADIENT,
  trackVariant = 'disk',
  centerDot = true,
  centerDotRadius = 5,
  centerDotColor = '#4A627A',
  centerDotRingColor = 'transparent',
  striped = false,
  stripeColor = '#7894ad',
  stripeBaseColor = '#5f7892',
  roundedCaps = false,
  showIndicator = false,
  indicatorRadius = 4,
  indicatorColor = CHART_COLORS.text,
  animation = true,
  ariaLabel = 'Radial donut chart',
  className = '',
}: RadialDonutProps) {
  const generatedId = useId()
  const gradientId = getGradientId('radial-donut-gradient', generatedId)
  const trackGradientId = getGradientId(
    'radial-donut-track-gradient',
    generatedId,
  )
  const stripePatternId = getGradientId('radial-donut-stripes', generatedId)
  const radius = size / 2
  const outerRadius = radius - gap
  const innerRadius = Math.max(outerRadius - thickness, 8)
  const displayedValue = useAnimatedNumber(value, animation)
  const displayedEndAngle = getValueAngle(
    displayedValue,
    0,
    max,
    startAngle,
    endAngle,
  )
  const createArc = arc<unknown>()
    .innerRadius(innerRadius)
    .outerRadius(outerRadius)
    .cornerRadius(roundedCaps ? thickness / 2 : 0)
  const trackArcPath =
    createArc({
      startAngle: (startAngle * Math.PI) / 180,
      endAngle: (endAngle * Math.PI) / 180,
    }) ?? ''
  const diskTrackPath =
    arc<unknown>().innerRadius(0).outerRadius(radius).cornerRadius(0)({
      startAngle: 0,
      endAngle: Math.PI * 2,
    }) ?? ''
  const trackPath = trackVariant === 'disk' ? diskTrackPath : trackArcPath
  const valuePath =
    createArc({
      startAngle: (startAngle * Math.PI) / 180,
      endAngle: (displayedEndAngle * Math.PI) / 180,
    }) ?? ''
  const stripedDiskPath =
    arc<unknown>().innerRadius(0).outerRadius(outerRadius).cornerRadius(0)({
      startAngle: 0,
      endAngle: Math.PI * 2,
    }) ?? ''

  const indicatorPoint = polarToCartesian(
    radius,
    radius,
    innerRadius + thickness / 2,
    displayedEndAngle,
  )

  return (
    <svg
      role="img"
      aria-label={ariaLabel}
      className={cn('block h-auto max-h-full max-w-full', className)}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
    >
      <defs>
        {renderGradientDefinition(color, gradientId)}
        {renderGradientDefinition(trackColor, trackGradientId)}
        <pattern
          id={stripePatternId}
          width={STRIPE_PATTERN_SIZE}
          height={STRIPE_PATTERN_SIZE}
          patternTransform="rotate(45)"
          patternUnits="userSpaceOnUse"
        >
          <rect
            width={STRIPE_PATTERN_SIZE}
            height={STRIPE_PATTERN_SIZE}
            fill={stripeBaseColor}
          />
          <line
            x1="0"
            x2="0"
            y1="0"
            y2={STRIPE_PATTERN_SIZE}
            stroke={stripeColor}
            strokeWidth={STRIPE_WIDTH}
          />
        </pattern>
      </defs>
      <g transform={`translate(${radius} ${radius})`}>
        <path
          data-testid="radial-donut-track"
          d={trackPath}
          fill={
            striped
              ? CHART_COLORS.trackNavy
              : getChartPaint(trackColor, trackGradientId)
          }
        />
        {striped ? (
          <path
            data-testid="radial-donut-stripes"
            d={stripedDiskPath}
            fill={`url(#${stripePatternId})`}
          />
        ) : (
          <path
            data-testid="radial-donut-arc"
            d={valuePath}
            fill={getChartPaint(color, gradientId)}
          />
        )}
      </g>
      {centerDot ? (
        <>
          <circle
            data-testid="radial-donut-center-dot-ring"
            cx={radius}
            cy={radius}
            r={centerDotRadius + 4.5}
            fill={centerDotRingColor}
          />
          <circle
            data-testid="radial-donut-center-dot"
            cx={radius}
            cy={radius}
            r={centerDotRadius}
            fill={centerDotColor}
          />
        </>
      ) : null}
      {showIndicator ? (
        <circle
          data-testid="radial-donut-indicator"
          cx={indicatorPoint.x}
          cy={indicatorPoint.y}
          r={indicatorRadius}
          fill={indicatorColor}
        />
      ) : null}
    </svg>
  )
}
