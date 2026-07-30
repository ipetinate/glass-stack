import { QueryClient } from '@tanstack/react-query'
import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { TemperatureEvent } from '@/modules/dashboard/api/queries'
import { customRender } from '@/test/test-utils'

import { Temperature } from './Temperature'

describe('Temperature', () => {
  it('renders real readings and unavailable sensors distinctly', () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          staleTime: Number.POSITIVE_INFINITY,
        },
      },
    })
    const event: TemperatureEvent = {
      type: 'temperature',
      occurredAt: '2026-07-28T18:35:35Z',
      payload: {
        cpu: 57.5,
        gpu: null,
        cpuSensor: 'PMU tdie2',
      },
    }

    queryClient.setQueryData(['events', 1], [event])

    customRender(<Temperature />, { queryClient })

    expect(screen.getByTestId('inverted-gauge-value')).toHaveTextContent('58°C')
    expect(
      screen.getByRole('group', { name: 'CPU sensor PMU tdie2' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Sensor indisponível')).toBeInTheDocument()
    expect(screen.getByTestId('inverted-gauge-status')).toHaveTextContent('CPU')
    expect(screen.getByText('GPU')).toBeInTheDocument()
  })
})
