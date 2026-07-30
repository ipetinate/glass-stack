import { fireEvent, render, screen } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import { describe, expect, it } from 'vitest'

import { GlassSelect } from './GlassSelect'

describe('GlassSelect', () => {
  it('renders the shared chevron spacing', () => {
    render(
      <GlassSelect aria-label="Interval" defaultValue="1">
        <option value="1">1 second</option>
      </GlassSelect>,
    )

    expect(screen.getByTestId('glass-select-chevron')).toBeInTheDocument()
    expect(screen.getByRole('combobox')).toHaveValue('1')
  })

  it('connects to React Hook Form when control and name are provided', () => {
    function Form() {
      const { control } = useForm({
        defaultValues: { interval: '1' },
      })

      return (
        <GlassSelect control={control} name="interval" aria-label="Interval">
          <option value="1">1 second</option>
          <option value="5">5 seconds</option>
        </GlassSelect>
      )
    }

    render(<Form />)

    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: '5' } })

    expect(select).toHaveValue('5')
  })
})
