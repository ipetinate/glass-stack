import { glassAPIURL } from '@/lib/glass-api'

import type { InstallOperation } from '../types'

export const installOperationEventType = 'glass.apps.operation'

export const installOperationsStreamEndpoint = '/api/v1/apps/events'

type AppEventEnvelope = {
  id: string
  schemaVersion: number
  type: string
  occurredAt: string
  payload: InstallOperation
}

export async function* streamInstallOperations(
  signal: AbortSignal,
): AsyncGenerator<InstallOperation> {
  const endpoint = glassAPIURL(installOperationsStreamEndpoint)

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

          const data = JSON.parse(dataLine.slice(5).trim()) as AppEventEnvelope
          if (data.type === installOperationEventType) {
            yield data.payload
          }
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