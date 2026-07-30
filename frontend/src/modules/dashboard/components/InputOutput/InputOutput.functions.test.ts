import { describe, expect, it } from 'vitest'

import type { DashboardEvent, IOEvent } from '@/modules/dashboard/api/queries'

import {
  formatBytes,
  formatRate,
  getIOEvents,
  getMetricGroups,
} from './InputOutput.functions'

describe('InputOutput functions', () => {
  it('filters I/O events and keeps only the requested history', () => {
    const events: DashboardEvent[] = [
      ioEvent(1),
      { type: 'cpu', occurredAt: '2026-07-28T20:00:01Z', payload: { overall: 10, perCore: [] } },
      ioEvent(2),
      ioEvent(3),
    ]

    expect(getIOEvents(events, 2).map((event) => event.payload.disk.readBytesPerSecond)).toEqual([2, 3])
  })

  it('builds storage, memory and network metric groups', () => {
    const groups = getMetricGroups([
      ioEvent(1024, 16 * 1024 ** 3),
      ioEvent(2048, 16 * 1024 ** 3),
    ])

    expect(groups.map((group) => group.label)).toEqual([
      'STORAGE DRIVE',
      'MEMORY',
      'NETWORK',
    ])
    expect(groups[0].lines[0].values).toEqual([1024, 2048])
    expect(groups[1].lines[0].yDomain).toEqual([0, 16 * 1024 ** 3])
    expect(groups[2].lines[1].values).toEqual([256, 256])
  })

  it('formats byte values and rates consistently', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(1024)).toBe('1.0 KiB')
    expect(formatBytes(2 * 1024 ** 2)).toBe('2.0 MiB')
    expect(formatRate(1024)).toBe('1.0 KiB/s')
  })
})

function ioEvent(readBytes: number, totalMemory = 16 * 1024 ** 3): IOEvent {
  return {
    type: 'io',
    occurredAt: '2026-07-28T20:00:00Z',
    payload: {
      disk: { readBytesPerSecond: readBytes, writeBytesPerSecond: 512 },
      memory: {
        totalBytes: totalMemory,
        usedBytes: 8 * 1024 ** 3,
        availableBytes: 8 * 1024 ** 3,
        usedPercent: 50,
      },
      network: { readBytesPerSecond: 128, writeBytesPerSecond: 256 },
    },
  }
}
