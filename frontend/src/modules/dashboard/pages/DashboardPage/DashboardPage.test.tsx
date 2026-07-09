import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { DashboardPage } from './DashboardPage'

describe('DashboardHomePage', () => {
  it('renders the dashboard widgets', () => {
    render(<DashboardPage />)

    expect(screen.getByText('Storage')).toBeInTheDocument()
    expect(screen.getByText('Applications')).toBeInTheDocument()
    expect(screen.getByText('Temperature')).toBeInTheDocument()
    expect(screen.getByText('Shortcuts')).toBeInTheDocument()
    expect(screen.getByText('Input / Output')).toBeInTheDocument()
  })
})
