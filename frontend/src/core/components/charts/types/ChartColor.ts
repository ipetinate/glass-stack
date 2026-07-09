export type ChartGradientStop = {
  offset: string
  color: string
  opacity?: number
}

export type ChartLinearGradient = {
  type: 'linear'
  stops: ChartGradientStop[]
  x1?: string
  x2?: string
  y1?: string
  y2?: string
}

export type ChartRadialGradient = {
  type: 'radial'
  stops: ChartGradientStop[]
  cx?: string
  cy?: string
  r?: string
}

export type ChartGradient = ChartLinearGradient | ChartRadialGradient

export type ChartColor = string | ChartGradient
