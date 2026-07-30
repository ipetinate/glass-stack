import { useId } from 'react'

import { cn } from '@/core/functions/class-name'

import { CHART_COLORS, DEFAULT_CHART_GRADIENT } from '@/core/constants/charts'
import {
  getChartPaint,
  getGradientId,
  polarToCartesian,
  renderGradientDefinition,
  useAnimatedNumber,
} from '@/core/functions/charts'
import type { ChartAnimation, ChartColor } from '../types'
import {
  getGaugeArcPath,
  getGaugeIndicatorColor,
  getGaugeTicks,
  getGaugeValueAngle,
} from './InvertedGauge.functions'

export type InvertedGaugeProps = {
  value: number
  min?: number
  max?: number
  width?: number
  height?: number
  startAngle?: number
  endAngle?: number
  arcThickness?: number
  trackColor?: string
  color?: ChartColor
  ticks?: number
  majorTickEvery?: number
  tickLength?: number
  majorTickLength?: number
  tickColor?: string
  majorTickColor?: string
  showIndicator?: boolean
  indicatorRadius?: number
  indicatorColor?: string | 'value'
  showValue?: boolean
  unit?: string
  statusLabel?: string
  statusColor?: string
  animation?: ChartAnimation
  ariaLabel?: string
  className?: string
}

const DEFAULT_WIDTH = 260
const DEFAULT_HEIGHT = 144
const DEFAULT_ARC_THICKNESS = 3
const DEFAULT_MIN = 0
const DEFAULT_MAX = 100
const INVERTED_START_ANGLE = 270
const INVERTED_END_ANGLE = 450
const DEFAULT_TICKS = 28
const DEFAULT_MAJOR_TICK_EVERY = 4
const DEFAULT_TICK_LENGTH = 2.5
const DEFAULT_MAJOR_TICK_LENGTH = 5
const GAUGE_CENTER_Y_RATIO = 0.78
const GAUGE_WIDTH_RADIUS_RATIO = 0.39
const GAUGE_HEIGHT_RADIUS_RATIO = 0.58
const GAUGE_TICK_GAP = 6
const GAUGE_TEXT_BOTTOM_GAP = 10

export function InvertedGauge({
  value,
  min = DEFAULT_MIN,
  max = DEFAULT_MAX,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
  startAngle = INVERTED_START_ANGLE,
  endAngle = INVERTED_END_ANGLE,
  arcThickness = DEFAULT_ARC_THICKNESS,
  trackColor = CHART_COLORS.trackNavy,
  color = DEFAULT_CHART_GRADIENT,
  ticks = DEFAULT_TICKS,
  majorTickEvery = DEFAULT_MAJOR_TICK_EVERY,
  tickLength = DEFAULT_TICK_LENGTH,
  majorTickLength = DEFAULT_MAJOR_TICK_LENGTH,
  tickColor = 'rgba(255,255,255,0.16)',
  majorTickColor = 'rgba(255,255,255,0.24)',
  showIndicator = true,
  indicatorRadius = 3,
  indicatorColor = CHART_COLORS.text,
  showValue = true,
  unit = '',
  statusLabel,
  statusColor = CHART_COLORS.mutedText,
  animation = true,
  ariaLabel = 'Inverted gauge chart',
  className = '',
}: InvertedGaugeProps) {
  const generatedId = useId()
  const gradientId = getGradientId('inverted-gauge-gradient', generatedId)

  const centerX = width / 2
  const centerY = height * GAUGE_CENTER_Y_RATIO
  const outerRadius = Math.min(
    width * GAUGE_WIDTH_RADIUS_RATIO,
    height * GAUGE_HEIGHT_RADIUS_RATIO,
  )
  const innerRadius = Math.max(outerRadius - arcThickness, 0)

  const displayedValue = useAnimatedNumber(value, animation)
  const displayedAngle = getGaugeValueAngle(
    displayedValue,
    min,
    max,
    startAngle,
    endAngle,
  )
  const displayedIndicatorColor = getGaugeIndicatorColor(
    indicatorColor,
    color,
    displayedValue,
    min,
    max,
  )

  const trackPath = getGaugeArcPath({
    innerRadius,
    outerRadius,
    startAngle,
    endAngle,
  })

  const valuePath = getGaugeArcPath({
    innerRadius,
    outerRadius,
    startAngle,
    endAngle: displayedAngle,
  })

  const indicatorPoint = polarToCartesian(
    centerX,
    centerY,
    outerRadius + indicatorRadius * -4,
    displayedAngle,
  )

  const gaugeTicks = getGaugeTicks({
    ticks,
    majorTickEvery,
    centerX,
    centerY,
    radius: outerRadius + majorTickLength + GAUGE_TICK_GAP,
    tickLength,
    majorTickLength,
    startAngle,
    endAngle,
  })

  return (
    <svg
      role="img"
      aria-label={ariaLabel}
      className={cn(
        'block size-full max-h-full max-w-full overflow-visible',
        className,
      )}
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>{renderGradientDefinition(color, gradientId)}</defs>

      <g>
        {gaugeTicks.map((tick) => (
          <line
            key={tick.angle}
            data-testid={
              tick.major ? 'inverted-gauge-major-tick' : 'inverted-gauge-tick'
            }
            x1={tick.inner.x}
            x2={tick.outer.x}
            y1={tick.inner.y}
            y2={tick.outer.y}
            stroke={tick.major ? majorTickColor : tickColor}
            strokeLinecap="round"
            strokeWidth={tick.major ? 0.95 : 0.65}
          />
        ))}
      </g>

      <g transform={`translate(${centerX} ${centerY})`}>
        <path
          data-testid="inverted-gauge-track"
          d={trackPath}
          fill={trackColor}
          opacity={0.82}
        />
        <path
          data-testid="inverted-gauge-arc"
          d={valuePath}
          fill={getChartPaint(color, gradientId)}
        />
      </g>

      {showIndicator ? (
        <circle
          data-testid="inverted-gauge-indicator"
          cx={indicatorPoint.x}
          cy={indicatorPoint.y}
          r={indicatorRadius}
          fill={displayedIndicatorColor}
        />
      ) : null}

      {showValue ? (
        <text
          data-testid="inverted-gauge-value"
          x={centerX}
          y={centerY - GAUGE_TEXT_BOTTOM_GAP - 18}
          fill={CHART_COLORS.text}
          fontSize={34}
          fontWeight={100}
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {Math.round(displayedValue)}
          {unit ? (
            <tspan
              fontSize={14}
              dx={3}
              dy={-9}
              fill="rgba(255,255,255,0.68)"
              fontWeight={100}
            >
              {unit}
            </tspan>
          ) : null}
        </text>
      ) : null}

      {statusLabel ? (
        <text
          data-testid="inverted-gauge-status"
          x={centerX}
          y={centerY - GAUGE_TEXT_BOTTOM_GAP + 10}
          fill={statusColor}
          fontSize={13}
          fontWeight={100}
          textAnchor="middle"
        >
          {statusLabel}
        </text>
      ) : null}
    </svg>
  )
}
