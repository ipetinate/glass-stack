export type MetricLine = {
  label: string
  color: string
  values: Array<number | null>
  format: (value: number) => string
  yDomain?: [number, number]
}

export type MetricGroup = {
  label: string
  lines: MetricLine[]
}
