import { QueryClient } from '@tanstack/react-query'
import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { customRender } from '@/test/test-utils'

import { DashboardPage } from './DashboardPage'

describe('DashboardHomePage', () => {
  it('renders the dashboard widgets', () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          staleTime: Number.POSITIVE_INFINITY,
        },
      },
    })
    customRender(<DashboardPage />, { queryClient })

    expect(screen.getByText('Storage')).toBeInTheDocument()
    expect(screen.getByText('Applications')).toBeInTheDocument()
    expect(screen.getByText('Input / Output')).toBeInTheDocument()
    expect(screen.getByText('Shortcuts')).toBeInTheDocument()
  })
})
