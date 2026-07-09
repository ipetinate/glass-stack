import { describe, expect, it } from 'vitest'

import { cn } from './class-name'

describe('cn', () => {
  it('combines conditional class names', () => {
    const isHidden = false

    expect(cn('base', isHidden && 'hidden', ['rounded', 'p-4'])).toBe(
      'base rounded p-4',
    )
  })

  it('merges conflicting Tailwind classes', () => {
    expect(cn('p-2 text-sm', 'p-4')).toBe('text-sm p-4')
  })
})
