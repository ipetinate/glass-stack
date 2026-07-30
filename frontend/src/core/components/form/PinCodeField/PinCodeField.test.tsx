import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { render } from '@/test/test-utils'

import { PinCodeField } from './PinCodeField'

describe('PinCodeField', () => {
  it('distributes pasted digits across the fields', () => {
    const onChange = vi.fn()

    render(<PinCodeField fields={6} groups={2} separator value="" onChange={onChange} />)

    fireEvent.paste(screen.getByLabelText('Código dígito 1'), {
      clipboardData: { getData: () => '46-1188' },
    })

    expect(onChange).toHaveBeenCalledWith('461188')
    expect(screen.getAllByRole('textbox')).toHaveLength(6)
  })
})
