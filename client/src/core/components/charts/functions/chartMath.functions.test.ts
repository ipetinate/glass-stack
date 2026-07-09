import { describe, expect, it } from 'vitest'

import {
  clamp,
  degreesToRadians,
  getPercent,
  getValueAngle,
  polarToCartesian,
} from './chartMath.functions'

describe('chart math functions', () => {
  it('clamps values inside the provided range', () => {
    expect(clamp(12, 0, 10)).toBe(10)
    expect(clamp(-2, 0, 10)).toBe(0)
    expect(clamp(4, 0, 10)).toBe(4)
  })

  it('calculates normalized percent safely', () => {
    expect(getPercent(50, 0, 100)).toBe(0.5)
    expect(getPercent(200, 0, 100)).toBe(1)
    expect(getPercent(10, 10, 10)).toBe(0)
  })

  it('converts polar coordinates using chart orientation', () => {
    expect(degreesToRadians(180)).toBeCloseTo(Math.PI)
    expect(polarToCartesian(50, 50, 20, 90)).toEqual({
      x: 70,
      y: 50,
    })
  })

  it('maps values into angular ranges', () => {
    expect(getValueAngle(50, 0, 100, 180, 360)).toBe(270)
  })
})
