import { arc, interpolateRgb } from 'd3'
import { useLayoutEffect, useRef, useState, type PointerEvent } from 'react'

import { cn } from '@/core/functions/class-name'
import { ChartTooltip } from '../ChartTooltip'

import {
  getGradientId,
  polarToCartesian,
  renderGradientDefinition,
  useAnimatedNumber,
} from '@/core/functions/charts'
import type { ChartAnimation, ChartColor } from '../types'

export type MultiRingGaugeRing = {
  id: string
  label: string
  value: number | null
  color?: ChartColor
  description?: string
  unit?: string
}

export type MultiRingGaugeProps = {
  rings: MultiRingGaugeRing[]
  label?: string
  centerValue?: number | null
  valueUnit?: string
  width?: number
  height?: number
  startAngle?: number
  endAngle?: number
  trackColor?: string
  animation?: ChartAnimation
  ariaLabel?: string
  className?: string
}

const DEFAULT_WIDTH = 340
const DEFAULT_HEIGHT = 240
const DEFAULT_START_ANGLE = 0
const DEFAULT_END_ANGLE = 270
const DEFAULT_TRACK_COLOR = 'rgba(10, 27, 47, 0.42)'
const DEFAULT_RING_COLORS = [
  '#52e6ff',
  '#68cfff',
  '#779eff',
  '#8b7cff',
  '#a76cff',
  '#c36bff',
]
const SCALE_STEPS = [0, 25, 50, 75, 100]

export function MultiRingGauge({
  rings,
  label,
  centerValue,
  valueUnit = '%',
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
  startAngle = DEFAULT_START_ANGLE,
  endAngle = DEFAULT_END_ANGLE,
  trackColor = DEFAULT_TRACK_COLOR,
  animation = true,
  ariaLabel = 'Multi-ring gauge chart',
  className = '',
}: MultiRingGaugeProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [hoveredRing, setHoveredRing] = useState<MultiRingGaugeRing | null>(
    null,
  )
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  const [tooltipSize, setTooltipSize] = useState({ width: 208, height: 104 })
  const tooltipRef = useRef<HTMLDivElement>(null)
  const tooltipLeaveTimeout = useRef<number | null>(null)
  const gradientPrefix = `multi-ring-${ariaLabel.replace(/[^a-z0-9]/gi, '-')}`
  // Leave enough horizontal breathing room for the 25%/50% tick labels.
  const centerX = width * 0.5
  const centerY = height * 0.52
  const outerRadius = Math.min(width * 0.34, height * 0.4)
  const ringGap = rings.length > 6 ? 4 : 6
  const ringThickness = Math.max(
    5,
    Math.min(
      12,
      (outerRadius - 8 - ringGap * Math.max(rings.length - 1, 0)) /
        rings.length,
    ),
  )
  const ringStep = ringThickness + ringGap
  // Keep the legend beside the open end of the rings, rather than at the
  // far-left edge of the circle where it becomes visually disconnected.
  const labelX = centerX - 32
  const centerTextValue = centerValue ?? null

  const updateTooltipPosition = (event: PointerEvent) => {
    void event
    const bounds = containerRef.current?.getBoundingClientRect()
    if (!bounds) return
    const tooltipWidth = tooltipRef.current?.offsetWidth ?? tooltipSize.width
    const tooltipHeight = tooltipRef.current?.offsetHeight ?? tooltipSize.height
    const padding = 12
    const desiredX = bounds.left + (bounds.width - tooltipWidth) / 2
    const desiredY = bounds.top - tooltipHeight - 8

    setTooltipPosition({
      x: Math.max(
        padding,
        Math.min(desiredX, window.innerWidth - tooltipWidth - padding),
      ),
      y: Math.max(
        padding,
        Math.min(
          desiredY < padding ? bounds.top + 8 : desiredY,
          window.innerHeight - tooltipHeight - padding,
        ),
      ),
    })
  }

  const keepTooltipOpen = () => {
    if (tooltipLeaveTimeout.current !== null)
      window.clearTimeout(tooltipLeaveTimeout.current)
  }

  const scheduleTooltipClose = () => {
    tooltipLeaveTimeout.current = window.setTimeout(
      () => setHoveredRing(null),
      220,
    )
  }

  useLayoutEffect(() => {
    if (!tooltipRef.current) return
    const nextSize = {
      width: tooltipRef.current.offsetWidth,
      height: tooltipRef.current.offsetHeight,
    }
    setTooltipSize(nextSize)
    const bounds = containerRef.current?.getBoundingClientRect()
    if (bounds) {
      const padding = 12
      const desiredY = bounds.top - nextSize.height + 8
      setTooltipPosition({
        x: Math.max(
          padding,
          Math.min(
            bounds.left + (bounds.width - nextSize.width) / 2,
            window.innerWidth - nextSize.width - padding,
          ),
        ),
        y: Math.max(
          padding,
          Math.min(
            desiredY < padding ? bounds.top + 8 : desiredY,
            window.innerHeight - nextSize.height - padding,
          ),
        ),
      })
    }
  }, [hoveredRing])

  return (
    <div ref={containerRef} className="relative inline-block align-top">
      <svg
        role="img"
        aria-label={ariaLabel}
        className={cn('block h-auto max-h-full max-w-full', className)}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
      >
        <defs>
          {rings.map((ring) => {
            const color =
              ring.color ??
              DEFAULT_RING_COLORS[
                rings.indexOf(ring) % DEFAULT_RING_COLORS.length
              ]
            return typeof color === 'string'
              ? null
              : renderGradientDefinition(
                  color,
                  getGradientId(gradientPrefix, ring.id),
                )
          })}
        </defs>
        <g aria-hidden="true">
          {SCALE_STEPS.map((percentage) => {
            const point = polarToCartesian(
              centerX,
              centerY,
              outerRadius + 7,
              startAngle + ((endAngle - startAngle) * percentage) / 100,
            )
            const tick = getScaleTick(point, percentage)

            return (
              <g key={percentage}>
                <path
                  d={tick.path}
                  fill="none"
                  stroke="rgba(255,255,255,0.48)"
                  strokeWidth={1}
                />
                <text
                  x={tick.textX}
                  y={tick.textY}
                  fill="rgba(255,255,255,0.62)"
                  fontSize={9}
                  textAnchor={tick.textAnchor}
                  dominantBaseline="middle"
                >
                  {percentage}%
                </text>
              </g>
            )
          })}
        </g>

        {rings.map((ring, index) => (
          <GaugeRing
            key={ring.id}
            ring={ring}
            index={index}
            centerX={centerX}
            centerY={centerY}
            radius={outerRadius - index * ringStep}
            thickness={ringThickness}
            startAngle={startAngle}
            endAngle={endAngle}
            trackColor={trackColor}
            color={
              ring.color ??
              DEFAULT_RING_COLORS[index % DEFAULT_RING_COLORS.length]
            }
            gradientId={getGradientId(gradientPrefix, ring.id)}
            animation={animation}
            labelX={labelX}
            labelY={centerY - outerRadius + index * ringStep + ringThickness}
            onPointerEnter={(hovered) => {
              keepTooltipOpen()
              setHoveredRing(hovered)
            }}
            onPointerMove={updateTooltipPosition}
            onPointerLeave={scheduleTooltipClose}
            valueUnit={valueUnit}
          />
        ))}

        {label ? (
          <text
            x={centerX}
            y={centerY - 4}
            fill="rgba(255,255,255,0.92)"
            fontSize={13}
            fontWeight={600}
            textAnchor="middle"
          >
            {label}
          </text>
        ) : null}
        {centerTextValue !== null ? (
          <text
            x={centerX}
            y={centerY + 14}
            fill="rgba(255,255,255,0.72)"
            fontSize={11}
            textAnchor="middle"
          >
            {Math.round(centerTextValue)}%
          </text>
        ) : null}
      </svg>
      {hoveredRing ? (
        <ChartTooltip
          ref={tooltipRef}
          title={hoveredRing.description ?? `${hoveredRing.label} utilization`}
          value={
            hoveredRing.value === null
              ? '—'
              : `${Math.round(hoveredRing.value)}${hoveredRing.unit ?? valueUnit}`
          }
          valueColor={getRingTooltipColor(hoveredRing)}
          portal
          interactive
          onPointerEnter={keepTooltipOpen}
          onPointerLeave={scheduleTooltipClose}
          className="fixed"
          style={{ left: tooltipPosition.x, top: tooltipPosition.y }}
        />
      ) : null}
    </div>
  )
}

function getRingTooltipColor(ring: MultiRingGaugeRing) {
  if (typeof ring.color === 'string' || !ring.color)
    return ring.color ?? '#52e6ff'
  const value = Math.max(0, Math.min(100, ring.value ?? 0))
  const stops = ring.color.stops
    .map((stop) => ({ ...stop, position: Number.parseFloat(stop.offset) }))
    .sort((a, b) => a.position - b.position)
  const upper = stops.find((stop) => stop.position >= value) ?? stops.at(-1)
  const lower =
    [...stops].reverse().find((stop) => stop.position <= value) ?? stops[0]
  if (!upper || !lower || upper.position === lower.position)
    return upper?.color ?? '#52e6ff'
  return interpolateRgb(
    lower.color,
    upper.color,
  )((value - lower.position) / (upper.position - lower.position))
}

type ScaleTick = {
  path: string
  textX: number
  textY: number
  textAnchor: 'start' | 'middle' | 'end'
}

function getScaleTick(
  point: { x: number; y: number },
  percentage: number,
): ScaleTick {
  if (percentage === 0) {
    return {
      path: `M ${point.x} ${point.y} V ${point.y - 8}`,
      textX: point.x,
      textY: point.y - 13,
      textAnchor: 'middle',
    }
  }

  if (percentage === 75) {
    return {
      path: `M ${point.x} ${point.y} V ${point.y + 10} H ${point.x + 10}`,
      textX: point.x + 15,
      textY: point.y + 10,
      textAnchor: 'start',
    }
  }

  if (percentage === 100) {
    return {
      path: `M ${point.x} ${point.y} H ${point.x - 10}`,
      textX: point.x - 15,
      textY: point.y,
      textAnchor: 'end',
    }
  }

  return {
    path: `M ${point.x} ${point.y} H ${point.x + 10}`,
    textX: point.x + 15,
    textY: point.y,
    textAnchor: 'start',
  }
}

type GaugeRingProps = {
  ring: MultiRingGaugeRing
  index: number
  centerX: number
  centerY: number
  radius: number
  thickness: number
  startAngle: number
  endAngle: number
  trackColor: string
  color: ChartColor
  gradientId: string
  animation: ChartAnimation
  labelX: number
  labelY: number
  onPointerEnter: (ring: MultiRingGaugeRing) => void
  onPointerMove: (event: PointerEvent) => void
  onPointerLeave: () => void
  valueUnit: string
}

function GaugeRing({
  ring,
  index,
  centerX,
  centerY,
  radius,
  thickness,
  startAngle,
  endAngle,
  trackColor,
  color,
  gradientId,
  animation,
  labelX,
  labelY,
  onPointerEnter,
  onPointerMove,
  onPointerLeave,
  valueUnit,
}: GaugeRingProps) {
  const value = ring.value ?? 0
  const displayedValue = useAnimatedNumber(value, animation)
  const innerRadius = Math.max(radius - thickness, 0)
  const createArc = arc<unknown>()
    .innerRadius(innerRadius)
    .outerRadius(radius)
    .cornerRadius(thickness / 2)

  const trackPath =
    createArc({
      startAngle: (startAngle * Math.PI) / 180,
      endAngle: (endAngle * Math.PI) / 180,
    }) ?? ''
  const valuePath =
    createArc({
      startAngle: (startAngle * Math.PI) / 180,
      endAngle:
        ((startAngle +
          Math.max(0, Math.min(100, displayedValue)) *
            ((endAngle - startAngle) / 100)) *
          Math.PI) /
        180,
    }) ?? ''

  return (
    <g
      className="cursor-pointer"
      onPointerEnter={() =>
        onPointerEnter({
          ...ring,
          color,
        })
      }
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
    >
      <g transform={`translate(${centerX} ${centerY})`}>
        <path d={trackPath} fill={trackColor} data-testid="multi-ring-track" />
        {ring.value !== null ? (
          typeof color === 'string' ? (
            <path
              d={valuePath}
              fill={color}
              data-testid={`multi-ring-value-${index}`}
            />
          ) : (
            (() => {
              const gradientArc = arc<unknown>()
                .innerRadius(Math.max(radius - thickness, 0))
                .outerRadius(radius)
                .cornerRadius(thickness / 2)
              const gradientPath =
                gradientArc({
                  startAngle: (startAngle * Math.PI) / 180,
                  endAngle:
                    ((startAngle +
                      (Math.max(0, Math.min(100, displayedValue)) *
                        (endAngle - startAngle)) /
                        100) *
                      Math.PI) /
                    180,
                }) ?? ''
              return (
                <path
                  d={gradientPath}
                  fill={`url(#${gradientId})`}
                  data-testid={`multi-ring-value-${index}`}
                />
              )
            })()
          )
        ) : null}
      </g>
      <text
        x={labelX}
        y={labelY}
        fill={
          typeof color === 'string'
            ? color
            : (color.stops[0]?.color ?? '#52e6ff')
        }
        fontSize={9}
        fontWeight={600}
        textAnchor="end"
      >
        {ring.label}
      </text>
      <text
        x={labelX + 7}
        y={labelY}
        fill="rgba(255,255,255,0.72)"
        fontSize={8}
        textAnchor="start"
      >
        {ring.value === null
          ? '—'
          : `${Math.round(ring.value)}${ring.unit ?? valueUnit}`}
      </text>
      <title>{`${ring.label}: ${ring.value === null ? 'unavailable' : `${Math.round(ring.value)}${ring.unit ?? valueUnit}`}`}</title>
    </g>
  )
}
