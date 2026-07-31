import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Input } from './Input'

describe('Input', () => {
  it('renders slots and clears a controlled value', () => {
    const onClear = vi.fn()
    render(<Input aria-label="Name" value="Ada" onChange={vi.fn()} clearable onClear={onClear} prepend={<span>+</span>} append={<span>suffix</span>} />)
    expect(screen.getByLabelText('Name')).toHaveValue('Ada')
    fireEvent.click(screen.getByRole('button', { name: 'Limpar' }))
    expect(onClear).toHaveBeenCalledOnce()
  })

  it('applies a token mask through the input prop', () => {
    render(<Input aria-label="CPF" mask="000.000.000-00" />)
    const input = screen.getByLabelText('CPF')
    fireEvent.change(input, { target: { value: '12345678901' } })
    expect(input).toHaveValue('123.456.789-01')
  })
})
