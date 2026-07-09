import { describe, expect, it } from 'vitest'

import {
  getSparklineAreaPath,
  getSparklinePath,
  getSparklinePoints,
  normalizePadding,
} from './Sparkline.functions'

describe('Sparkline functions', () => {
  it('normalizes numeric and object padding', () => {
    expect(normalizePadding(4)).toEqual({
      top: 4,
      right: 4,
      bottom: 4,
      left: 4,
    })
    expect(normalizePadding({ top: 2, left: 6 })).toEqual({
      top: 2,
      right: 0,
      bottom: 0,
      left: 6,
    })
  })

  it('generates points and paths from data', () => {
    const config = {
      data: [1, 3, 2],
      width: 100,
      height: 40,
      padding: 4,
      curve: 'linear' as const,
    }

    expect(getSparklinePoints(config)).toHaveLength(3)
    expect(getSparklinePath(config)).toContain('L')
    expect(getSparklineAreaPath(config)).toContain('Z')
  })
})
