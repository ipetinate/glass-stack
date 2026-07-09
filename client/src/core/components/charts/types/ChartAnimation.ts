export type ChartAnimationEasing = 'cubicOut' | 'linear'

export type ChartAnimation =
  | boolean
  | {
      enabled?: boolean
      duration?: number
      delay?: number
      easing?: ChartAnimationEasing
    }

export type NormalizedChartAnimation = {
  enabled: boolean
  duration: number
  delay: number
  easing: ChartAnimationEasing
}
