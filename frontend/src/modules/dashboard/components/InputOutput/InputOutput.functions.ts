import type { DashboardEvent, IOEvent } from '@/modules/dashboard/api/queries'

import { INPUT_OUTPUT_GROUPS } from './InputOutput.constants'
import type { MetricGroup } from './InputOutput.types'

export function getIOEvents(events: DashboardEvent[], historySize: number) {
  return events
    .filter(isIOEvent)
    .slice(-historySize)
}

export function getMetricGroups(ioEvents: IOEvent[]): MetricGroup[] {
  const memoryDomain = getMemoryDomain(ioEvents)

  return [
    {
      label: INPUT_OUTPUT_GROUPS.storage.label,
      lines: [
        {
          label: 'READ',
          color: INPUT_OUTPUT_GROUPS.storage.readColor,
          values: ioEvents.map(
            (event) => event.payload.disk.readBytesPerSecond,
          ),
          format: formatRate,
        },
        {
          label: 'WRITE',
          color: INPUT_OUTPUT_GROUPS.storage.writeColor,
          values: ioEvents.map(
            (event) => event.payload.disk.writeBytesPerSecond,
          ),
          format: formatRate,
        },
      ],
    },
    {
      label: INPUT_OUTPUT_GROUPS.memory.label,
      lines: [
        {
          label: 'USED',
          color: INPUT_OUTPUT_GROUPS.memory.usedColor,
          values: ioEvents.map((event) => event.payload.memory.usedBytes),
          format: formatBytes,
          yDomain: memoryDomain,
        },
        {
          label: 'AVAILABLE',
          color: INPUT_OUTPUT_GROUPS.memory.availableColor,
          values: ioEvents.map(
            (event) => event.payload.memory.availableBytes,
          ),
          format: formatBytes,
          yDomain: memoryDomain,
        },
      ],
    },
    {
      label: INPUT_OUTPUT_GROUPS.network.label,
      lines: [
        {
          label: 'DOWNLOAD',
          color: INPUT_OUTPUT_GROUPS.network.downloadColor,
          values: ioEvents.map(
            (event) => event.payload.network.readBytesPerSecond,
          ),
          format: formatRate,
        },
        {
          label: 'UPLOAD',
          color: INPUT_OUTPUT_GROUPS.network.uploadColor,
          values: ioEvents.map(
            (event) => event.payload.network.writeBytesPerSecond,
          ),
          format: formatRate,
        },
      ],
    },
  ]
}

function isIOEvent(event: DashboardEvent): event is IOEvent {
  return event.type === 'io'
}

function getMemoryDomain(ioEvents: IOEvent[]): [number, number] | undefined {
  const totalBytes = [...ioEvents]
    .reverse()
    .map((event) => event.payload.memory.totalBytes)
    .find((value): value is number => value !== null && value > 0)

  return totalBytes ? [0, totalBytes] : undefined
}

export function formatRate(bytesPerSecond: number) {
  return `${formatBytes(bytesPerSecond)}/s`
}

export function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B'
  }

  const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB']
  const unitIndex = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  )
  const value = bytes / 1024 ** unitIndex
  const precision = value >= 100 || unitIndex === 0 ? 0 : 1

  return `${value.toFixed(precision)} ${units[unitIndex]}`
}
