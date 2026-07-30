import type { MetricLine } from '../InputOutput/InputOutput.types'

export type MetricChartState = {
  chartValues: number[]
  formattedValue: string
} | null

export function getMetricChartState(line: MetricLine): MetricChartState {
  const availableValues = line.values.filter(
    (value): value is number => value !== null,
  )
  const latestValue = line.values.at(-1)

  if (latestValue == null || availableValues.length === 0) {
    return null
  }

  return {
    chartValues:
      availableValues.length === 1
        ? [availableValues[0], availableValues[0]]
        : availableValues,
    formattedValue: line.format(latestValue),
  }
}
