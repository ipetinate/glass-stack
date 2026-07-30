import { interpolateArray } from 'd3'
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
} from 'react'

import { cn } from '@/core/functions/class-name'
import { ChartTooltip } from '../ChartTooltip'

import { CHART_COLORS } from '@/core/constants/charts'
import {
  getChartEase,
  getChartPaint,
  getGradientId,
  normalizeChartAnimation,
  prefersReducedMotion,
  renderGradientDefinition,
} from '@/core/functions/charts'
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
  showTooltip?: boolean
  tooltipFormat?: (value: number) => string
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
  showTooltip = false,
  tooltipFormat = (value) => String(value),
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
  const linePath =
    displayData.length > 1 ? getSparklinePath(pathConfig) : EMPTY_PATH
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
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const [hoverPointer, setHoverPointer] = useState({ x: 0, y: 0 })
  const tooltipLeaveTimeout = useRef<number | null>(null)
  const hoveredPoint = hoverIndex === null ? null : points[hoverIndex]
  const handlePointerMove = (event: PointerEvent<SVGRectElement>) => {
    if (!showTooltip || points.length === 0) return
    const bounds = event.currentTarget.getBoundingClientRect()
    const localX = ((event.clientX - bounds.left) / bounds.width) * width
    const firstX = points[0]?.x ?? 0
    const lastX = points.at(-1)?.x ?? width
    const ratio = lastX === firstX ? 0 : (localX - firstX) / (lastX - firstX)
    const nextIndex = Math.max(
      0,
      Math.min(points.length - 1, Math.round(ratio * (points.length - 1))),
    )
    const nextPoint = points[nextIndex]
    setHoverIndex(nextIndex)
    setHoverPointer({
      x: bounds.left + ((nextPoint?.x ?? 0) / width) * bounds.width,
      y: bounds.top + ((nextPoint?.y ?? 0) / height) * bounds.height,
    })
  }
  const keepTooltipOpen = () => {
    if (tooltipLeaveTimeout.current !== null)
      window.clearTimeout(tooltipLeaveTimeout.current)
  }
  const scheduleTooltipClose = () => {
    tooltipLeaveTimeout.current = window.setTimeout(
      () => setHoverIndex(null),
      220,
    )
  }

  return (
    <div className="relative inline-block max-w-full overflow-visible">
      <svg
        role="img"
        aria-label={ariaLabel}
        className={cn('block overflow-visible', className)}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        onPointerLeave={scheduleTooltipClose}
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
        {showTooltip ? (
          <>
            <rect
              data-testid="sparkline-hit-area"
              width={width}
              height={height}
              fill="transparent"
              onPointerMove={handlePointerMove}
            />
            {hoveredPoint ? (
              <>
                <line
                  data-testid="sparkline-hover-line"
                  x1={hoveredPoint.x}
                  x2={hoveredPoint.x}
                  y1={paddingValue(padding, 'top')}
                  y2={height - paddingValue(padding, 'bottom')}
                  stroke="rgba(255,255,255,0.55)"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                />
                <circle
                  data-testid="sparkline-hover-dot"
                  cx={hoveredPoint.x}
                  cy={hoveredPoint.y}
                  r={3.5}
                  fill={getChartPaint(color, lineGradientId)}
                  stroke="rgba(255,255,255,0.9)"
                  strokeWidth={1}
                />
              </>
            ) : null}
          </>
        ) : null}
      </svg>
      {showTooltip && hoveredPoint ? (
        <ChartTooltip
          testId="sparkline-tooltip"
          compact
          portal
          interactive
          onPointerEnter={keepTooltipOpen}
          onPointerLeave={scheduleTooltipClose}
          className="fixed whitespace-nowrap"
          style={{
            left:
              hoverPointer.x < window.innerWidth - 180
                ? hoverPointer.x + 8
                : hoverPointer.x - 8,
            transform:
              hoverPointer.x < window.innerWidth - 180
                ? 'none'
                : 'translateX(-100%)',
            top: Math.max(
              12,
              Math.min(hoverPointer.y - 24, window.innerHeight - 36),
            ),
          }}
          value={tooltipFormat(displayData[hoverIndex ?? 0] ?? 0)}
        />
      ) : null}
    </div>
  )
}

function paddingValue(padding: SparklinePadding, side: 'top' | 'bottom') {
  if (typeof padding === 'number') return padding
  return padding[side] ?? 0
}
