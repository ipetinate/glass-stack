import { area, curveBasis, curveLinear, curveMonotoneX, line, scaleLinear } from 'd3'

export type SparklinePoint = {
  x: number
  y: number
}

export type SparklineCurve = 'basis' | 'linear' | 'monotone'

export type SparklinePadding = number | Partial<Record<'top' | 'right' | 'bottom' | 'left', number>>

export type SparklinePathConfig = {
  data: number[]
  width: number
  height: number
  yDomain?: [number, number]
  padding: SparklinePadding
  curve: SparklineCurve
}

const DEFAULT_DOMAIN_PADDING = 1

export function normalizePadding(padding: SparklinePadding) {
  if (typeof padding === 'number') {
    return {
      top: padding,
      right: padding,
      bottom: padding,
      left: padding,
    }
  }

  return {
    top: padding.top ?? 0,
    right: padding.right ?? 0,
    bottom: padding.bottom ?? 0,
    left: padding.left ?? 0,
  }
}

function getCurve(curve: SparklineCurve) {
  if (curve === 'basis') return curveBasis
  if (curve === 'linear') return curveLinear

  return curveMonotoneX
}

export function getSparklinePoints({
  data,
  width,
  height,
  yDomain,
  padding,
}: Omit<SparklinePathConfig, 'curve'>): SparklinePoint[] {
  const resolvedPadding = normalizePadding(padding)
  const minValue = Math.min(...data)
  const maxValue = Math.max(...data)
  const resolvedDomain: [number, number] =
    yDomain ??
    (minValue === maxValue
      ? [minValue - DEFAULT_DOMAIN_PADDING, maxValue + DEFAULT_DOMAIN_PADDING]
      : [minValue, maxValue])
  const xScale = scaleLinear()
    .domain([0, Math.max(data.length - 1, 1)])
    .range([resolvedPadding.left, width - resolvedPadding.right])
  const yScale = scaleLinear()
    .domain(resolvedDomain)
    .range([height - resolvedPadding.bottom, resolvedPadding.top])

  return data.map((value, index) => ({
    x: xScale(index),
    y: yScale(value),
  }))
}

export function getSparklinePath(config: SparklinePathConfig) {
  const points = getSparklinePoints(config)
  const lineGenerator = line<SparklinePoint>()
    .x((point) => point.x)
    .y((point) => point.y)
    .curve(getCurve(config.curve))

  return lineGenerator(points) ?? ''
}

export function getSparklineAreaPath(config: SparklinePathConfig) {
  const resolvedPadding = normalizePadding(config.padding)
  const points = getSparklinePoints(config)
  const areaGenerator = area<SparklinePoint>()
    .x((point) => point.x)
    .y0(config.height - resolvedPadding.bottom)
    .y1((point) => point.y)
    .curve(getCurve(config.curve))

  return areaGenerator(points) ?? ''
}
