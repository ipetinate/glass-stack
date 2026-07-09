import { easeCubicOut, easeLinear, interpolateNumber } from 'd3'
import { useEffect, useMemo, useRef, useState } from 'react'

import { DEFAULT_CHART_ANIMATION } from '../constants'
import type { ChartAnimation, NormalizedChartAnimation } from '../types'

export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function normalizeChartAnimation(
  animation: ChartAnimation = true,
): NormalizedChartAnimation {
  if (typeof animation === 'boolean') {
    return {
      ...DEFAULT_CHART_ANIMATION,
      enabled: animation,
    }
  }

  return {
    ...DEFAULT_CHART_ANIMATION,
    ...animation,
    enabled: animation.enabled ?? DEFAULT_CHART_ANIMATION.enabled,
  }
}

export function getChartEase(easing: NormalizedChartAnimation['easing']) {
  return easing === 'linear' ? easeLinear : easeCubicOut
}

/**
 * Animates numeric chart state without letting D3 mutate SVG nodes directly.
 */
export function useAnimatedNumber(value: number, animation?: ChartAnimation) {
  const normalizedAnimation = useMemo(
    () => normalizeChartAnimation(animation),
    [animation],
  )
  const [displayValue, setDisplayValue] = useState(() =>
    normalizedAnimation.enabled && !prefersReducedMotion() ? 0 : value,
  )
  const previousValueRef = useRef(displayValue)

  useEffect(() => {
    if (!normalizedAnimation.enabled || prefersReducedMotion()) {
      setDisplayValue(value)
      previousValueRef.current = value
      return
    }

    let frameId = 0
    let timeoutId = 0
    const fromValue = previousValueRef.current
    const interpolate = interpolateNumber(fromValue, value)
    const ease = getChartEase(normalizedAnimation.easing)
    const startAnimation = () => {
      const startedAt = performance.now()

      const tick = (now: number) => {
        const progress = Math.min(
          (now - startedAt) / normalizedAnimation.duration,
          1,
        )

        setDisplayValue(interpolate(ease(progress)))

        if (progress < 1) {
          frameId = requestAnimationFrame(tick)
        } else {
          previousValueRef.current = value
          setDisplayValue(value)
        }
      }

      frameId = requestAnimationFrame(tick)
    }

    timeoutId = window.setTimeout(startAnimation, normalizedAnimation.delay)

    return () => {
      window.clearTimeout(timeoutId)
      cancelAnimationFrame(frameId)
    }
  }, [normalizedAnimation, value])

  return displayValue
}
