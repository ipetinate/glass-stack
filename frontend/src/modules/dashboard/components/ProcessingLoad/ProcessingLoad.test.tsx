import { QueryClient } from '@tanstack/react-query'
import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { useEventSamplingStore } from '@/core/stores/event-sampling'
import { customRender } from '@/test/test-utils'

import { ProcessingLoad } from './ProcessingLoad'

describe('ProcessingLoad', () => {
  it('renders summarized CPU metrics alongside GPU usage', () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          staleTime: Number.POSITIVE_INFINITY,
        },
      },
    })
    useEventSamplingStore.setState({ intervalSeconds: 1 })
    queryClient.setQueryData(['events', 1], [
      {
        type: 'cpu',
        occurredAt: '2026-07-28T20:00:00Z',
        payload: {
          overall: 72,
          perCore: [60, 80, 70, 78],
        },
      },
      {
        type: 'gpu',
        occurredAt: '2026-07-28T20:00:00Z',
        payload: { usagePercent: 41, rendererPercent: 36, tilerPercent: 18 },
      },
    ])

    customRender(<ProcessingLoad />, { queryClient })

    expect(screen.getByText('Processing Load')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'CPU processing load' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'GPU processing load' })).toBeInTheDocument()
    expect(screen.getByText('Core avg')).toBeInTheDocument()
    expect(screen.getByText('Core peak')).toBeInTheDocument()
    expect(screen.getByText('Renderer')).toBeInTheDocument()
    expect(screen.getByText('Tiler')).toBeInTheDocument()
    expect(screen.getAllByText('41%')).toHaveLength(2)
  })
})
