import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { render } from '@/test/test-utils'

import { GlassInput } from './GlassInput'

describe('GlassInput', () => {
  it('passes clipboard text to the controlled input owner', async () => {
    const readText = vi.fn().mockResolvedValue('bootstrap-token')
    const onPasteValue = vi.fn()
    const user = userEvent.setup()
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: { readText },
    })

    render(
      <GlassInput
        allowPaste
        aria-label="Bootstrap token"
        onPasteValue={onPasteValue}
      />,
    )

    await user.click(
      screen.getByRole('button', {
        name: 'Colar da área de transferência',
      }),
    )

    expect(readText).toHaveBeenCalledOnce()
    expect(onPasteValue).toHaveBeenCalledWith('bootstrap-token')
  })
})
