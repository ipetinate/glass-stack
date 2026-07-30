import { QueryClient } from '@tanstack/react-query'
import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { DashboardEvent } from '@/modules/dashboard/api/queries'
import { customRender } from '@/test/test-utils'

import { InputOutput } from './InputOutput'

describe('InputOutput', () => {
  it('renders real system I/O values and histories', () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          staleTime: Number.POSITIVE_INFINITY,
        },
      },
    })
    const events: DashboardEvent[] = [
      ioEvent({
        diskRead: 1_024,
        diskWrite: 512,
        memoryUsed: 8 * 1024 ** 3,
        memoryAvailable: 4 * 1024 ** 3,
        networkDownload: 2_048,
        networkUpload: 256,
      }),
      ioEvent({
        diskRead: 2_048,
        diskWrite: 1_024,
        memoryUsed: 9 * 1024 ** 3,
        memoryAvailable: 3 * 1024 ** 3,
        networkDownload: 4_096,
        networkUpload: 512,
      }),
    ]

    queryClient.setQueryData(['events', 1], events)

    customRender(<InputOutput />, { queryClient })

    expect(screen.getByText('STORAGE DRIVE')).toBeInTheDocument()
    expect(screen.getByText('MEMORY')).toBeInTheDocument()
    expect(screen.getByText('NETWORK')).toBeInTheDocument()
    expect(screen.getByText('USED')).toBeInTheDocument()
    expect(screen.getByText('AVAILABLE')).toBeInTheDocument()
    expect(
      screen.getByRole('img', { name: 'DOWNLOAD: 4.0 KiB/s' }),
    ).toBeInTheDocument()
    expect(screen.getByText('9.0 GiB')).toBeInTheDocument()
  })
})

type IOValues = {
  diskRead: number
  diskWrite: number
  memoryUsed: number
  memoryAvailable: number
  networkDownload: number
  networkUpload: number
}

function ioEvent(values: IOValues): DashboardEvent {
  return {
    type: 'io',
    occurredAt: '2026-07-28T20:00:00Z',
    payload: {
      disk: {
        readBytesPerSecond: values.diskRead,
        writeBytesPerSecond: values.diskWrite,
      },
      memory: {
        totalBytes: 16 * 1024 ** 3,
        usedBytes: values.memoryUsed,
        availableBytes: values.memoryAvailable,
        usedPercent: 75,
      },
      network: {
        readBytesPerSecond: values.networkDownload,
        writeBytesPerSecond: values.networkUpload,
      },
    },
  }
}
