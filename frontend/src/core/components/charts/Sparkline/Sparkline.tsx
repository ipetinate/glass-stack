import { interpolateArray } from 'd3'
import { useEffect, useId, useMemo, useRef, useState } from 'react'

import { cn } from '@/core/functions/class-name'

import { CHART_COLORS } from '../constants'
import {
  getChartEase,
  getChartPaint,
  getGradientId,
  normalizeChartAnimation,
  prefersReducedMotion,
  renderGradientDefinition,
} from '../functions'
import type { ChartAnimation, ChartColor } from '../types'
import {
  getSparklineAreaPath,
  getSparklinePath,
  getSparklinePoints,
  type SparklineCurve,
  type SparklinePadding,
} from './Sparkline.functions'

export type SparklineProps = {
  data: number[]
  width?: number
  height?: number
  strokeWidth?: number
  color?: ChartColor
  fill?: ChartColor
  fillOpacity?: number
  curve?: SparklineCurve
  showArea?: boolean
  showEndpoint?: boolean
  endpointRadius?: number
  yDomain?: [number, number]
  padding?: SparklinePadding
  animation?: ChartAnimation
  ariaLabel?: string
  className?: string
}

const DEFAULT_WIDTH = 160
const DEFAULT_HEIGHT = 60
const DEFAULT_STROKE_WIDTH = 3
const DEFAULT_PADDING = 4
const EMPTY_PATH = ''

export function Sparkline({
  data,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
  strokeWidth = DEFAULT_STROKE_WIDTH,
  color = CHART_COLORS.mint,
  fill = CHART_COLORS.mint,
  fillOpacity = 0.18,
  curve = 'monotone',
  showArea = true,
  showEndpoint = true,
  endpointRadius = 3,
  yDomain,
  padding = DEFAULT_PADDING,
  animation = true,
  ariaLabel = 'Sparkline chart',
  className = '',
}: SparklineProps) {
  const generatedId = useId()
  const lineGradientId = getGradientId('sparkline-line-gradient', generatedId)
  const fillGradientId = getGradientId('sparkline-fill-gradient', generatedId)
  const normalizedAnimation = useMemo(
    () => normalizeChartAnimation(animation),
    [animation],
  )
  const [displayData, setDisplayData] = useState(() =>
    normalizedAnimation.enabled && !prefersReducedMotion()
      ? data.map(() => data[0] ?? 0)
      : data,
  )
  const previousDataRef = useRef(displayData)

  useEffect(() => {
    if (!normalizedAnimation.enabled || prefersReducedMotion()) {
      setDisplayData(data)
      previousDataRef.current = data
      return
    }

    let frameId = 0
    let timeoutId = 0
    const longestLength = Math.max(previousDataRef.current.length, data.length)
    const previousData = Array.from(
      { length: longestLength },
      (_, index) =>
        previousDataRef.current[index] ??
        previousDataRef.current[previousDataRef.current.length - 1] ??
        0,
    )
    const nextData = Array.from(
      { length: longestLength },
      (_, index) => data[index] ?? data[data.length - 1] ?? 0,
    )
    const interpolate = interpolateArray(previousData, nextData)
    const ease = getChartEase(normalizedAnimation.easing)

    const startAnimation = () => {
      const startedAt = performance.now()

      const tick = (now: number) => {
        const progress = Math.min(
          (now - startedAt) / normalizedAnimation.duration,
          1,
        )
        const interpolatedData = interpolate(ease(progress))

        setDisplayData(interpolatedData)

        if (progress < 1) {
          frameId = requestAnimationFrame(tick)
        } else {
          previousDataRef.current = data
          setDisplayData(data)
        }
      }

      frameId = requestAnimationFrame(tick)
    }

    timeoutId = window.setTimeout(startAnimation, normalizedAnimation.delay)

    return () => {
      window.clearTimeout(timeoutId)
      cancelAnimationFrame(frameId)
    }
  }, [data, normalizedAnimation])

  const pathConfig = {
    data: displayData,
    width,
    height,
    yDomain,
    padding,
    curve,
  }
  const linePath = displayData.length > 1 ? getSparklinePath(pathConfig) : EMPTY_PATH
  const areaPath =
    displayData.length > 1 ? getSparklineAreaPath(pathConfig) : EMPTY_PATH
  const points = getSparklinePoints({
    data: displayData.length > 0 ? displayData : [0],
    width,
    height,
    yDomain,
    padding,
  })
  const endpoint = points[points.length - 1]

  return (
    <svg
      role="img"
      aria-label={ariaLabel}
      className={cn('block overflow-visible', className)}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
    >
      <defs>
        {renderGradientDefinition(color, lineGradientId)}
        {renderGradientDefinition(fill, fillGradientId)}
      </defs>
      {showArea ? (
        <path
          data-testid="sparkline-area"
          d={areaPath}
          fill={getChartPaint(fill, fillGradientId)}
          opacity={fillOpacity}
        />
      ) : null}
      <path
        data-testid="sparkline-line"
        d={linePath}
        fill="none"
        stroke={getChartPaint(color, lineGradientId)}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
      />
      {showEndpoint && endpoint ? (
        <circle
          data-testid="sparkline-endpoint"
          cx={endpoint.x}
          cy={endpoint.y}
          r={endpointRadius}
          fill={getChartPaint(color, lineGradientId)}
        />
      ) : null}
    </svg>
  )
}
