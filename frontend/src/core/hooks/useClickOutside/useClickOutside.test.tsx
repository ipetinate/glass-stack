import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { useClickOutside } from './useClickOutside'
import { getClickOutsideListenerCount } from './useClickOutside.functions'

function Surface() {
  const [open, setOpen] = useState(false)
  const ref = useClickOutside<HTMLDivElement>(() => setOpen(false), { enabled: open })
  return <><button onClick={() => setOpen(true)}>open</button>{open ? <div ref={ref}>surface</div> : null}</>
}

describe('useClickOutside', () => {
  it('registers globally only while enabled and closes on an outside pointer', () => {
    render(<Surface />)
    expect(getClickOutsideListenerCount()).toBe(0)
    fireEvent.click(screen.getByRole('button', { name: 'open' }))
    expect(getClickOutsideListenerCount()).toBe(1)
    fireEvent.pointerDown(document.body)
    expect(screen.queryByText('surface')).not.toBeInTheDocument()
    expect(getClickOutsideListenerCount()).toBe(0)
  })
})
