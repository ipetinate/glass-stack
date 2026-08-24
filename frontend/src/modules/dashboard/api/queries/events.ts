export interface TemperatureEvent {
  type: 'temperature'
  occurredAt: string
  payload: {
    cpu: number | null
    gpu: number | null
    cpuSensor?: string
    gpuSensor?: string
  }
}

export interface IOEvent {
  type: 'io'
  occurredAt: string
  payload: {
    disk: {
      readBytesPerSecond: number | null
      writeBytesPerSecond: number | null
    }
    memory: {
      totalBytes: number | null
      usedBytes: number | null
      availableBytes: number | null
      usedPercent: number | null
    }
    network: {
      readBytesPerSecond: number | null
      writeBytesPerSecond: number | null
    }
  }
}

export interface CPUEvent {
  type: 'cpu'
  occurredAt: string
  payload: {
    overall: number | null
    perCore: number[] | null
  }
}

export interface GPUEvent {
  type: 'gpu'
  occurredAt: string
  payload: {
    usagePercent: number | null
    rendererPercent: number | null
    tilerPercent: number | null
  }
}

export type DashboardEvent = TemperatureEvent | IOEvent | CPUEvent | GPUEvent

export async function* streamEvents(
  signal: AbortSignal,
  intervalSeconds = 1,
): AsyncGenerator<DashboardEvent> {
  const endpoint = glassAPIURL('/api/v1/events')
  endpoint.searchParams.set('interval', String(intervalSeconds))

  let lastEventId = ''
  let reconnectAttempt = 0

  while (!signal.aborted) {
    const response = await fetch(endpoint, {
      credentials: 'include',
      signal,
      headers: {
        Accept: 'text/event-stream',
        ...(lastEventId ? { 'Last-Event-ID': lastEventId } : {}),
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to connect: ${response.status}`)
    }

    if (!response.body) {
      throw new Error('Response body is not available')
    }

    reconnectAttempt = 0
    const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
    let buffer = ''

    try {
      while (true) {
        const { value, done } = await reader.read()

        if (done) {
          break
        }

        buffer += value

        const messages = buffer.split('\n\n')
        buffer = messages.pop() ?? ''

        for (const message of messages) {
          const idLine = message
            .split('\n')
            .find((line) => line.startsWith('id:'))
          const dataLine = message
            .split('\n')
            .find((line) => line.startsWith('data:'))

          if (idLine) {
            lastEventId = idLine.slice(3).trim()
          }
          if (!dataLine) {
            continue
          }

          const data = dataLine.slice(5).trim()
          yield JSON.parse(data) as DashboardEvent
        }
      }
    } catch (error) {
      if (signal.aborted) throw error
    } finally {
      reader.releaseLock()
    }

    if (signal.aborted) return
    const delay = Math.min(5000, 250 * 2 ** reconnectAttempt)
    reconnectAttempt += 1
    await waitForReconnect(signal, delay)
  }
}

function waitForReconnect(signal: AbortSignal, delay: number) {
  return new Promise<void>((resolve) => {
    const timeout = window.setTimeout(resolve, delay)
    signal.addEventListener(
      'abort',
      () => {
        window.clearTimeout(timeout)
        resolve()
      },
      { once: true },
    )
  })
}
import { glassAPIURL } from '@/lib/glass-api'
