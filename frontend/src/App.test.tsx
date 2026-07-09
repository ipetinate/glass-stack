import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/weather', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/weather')>()

  return {
    ...original,
    Weather: () => <div>Weather</div>,
  }
})

describe('App', () => {
  beforeEach(() => {
    vi.resetModules()
    window.history.pushState({}, '', '/')
  })

  it('renders the router inside app providers', async () => {
    const { App } = await import('./App')

    render(<App />)

    expect(screen.getByText('Storage')).toBeInTheDocument()
  })

  it('initializes from the current browser path', async () => {
    window.history.pushState({}, '', '/settings')
    const { App } = await import('./App')

    render(<App />)

    expect(screen.getAllByRole('heading', { name: 'Settings' }).length).toBeGreaterThan(
      0,
    )
  })
})
