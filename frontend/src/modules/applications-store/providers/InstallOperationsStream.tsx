import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'

import { applicationsQueryKey } from '../repositories/useApplications'
import {
  isTerminalOperation,
  useInstallOperations,
} from '../stores/install-operations'
import { streamInstallOperations } from '../api/installOperationsStream'
import { getInstallOperation } from '../api/applications'

export function InstallOperationsStream() {
  const queryClient = useQueryClient()
  const operations = useInstallOperations((state) => state.operations)
  const previousTerminal = useRef<string[]>([])

  useEffect(() => {
    const controller = new AbortController()

    void (async () => {
      while (!controller.signal.aborted) {
        try {
          for await (const operation of streamInstallOperations(controller.signal)) {
            useInstallOperations.getState().upsertOperation(operation)
          }
        } catch {
          if (controller.signal.aborted) return
          await waitForReconnect(controller.signal, 1000)
        }
      }
    })()

    return () => controller.abort()
  }, [])

  useEffect(() => {
    const persisted = Object.values(useInstallOperations.getState().operations)
    if (persisted.length === 0) return

    for (const operation of persisted) {
      getInstallOperation(operation.id)
        .then((fresh) => useInstallOperations.getState().upsertOperation(fresh))
        .catch(() => useInstallOperations.getState().removeOperation(operation.appId))
    }
  }, [])

  useEffect(() => {
    const terminal = Object.values(operations).filter((operation) =>
      isTerminalOperation(operation.status),
    )
    if (terminal.length === 0) {
      previousTerminal.current = []
      return
    }

    const appIds = terminal
      .map((operation) => operation.appId)
      .sort()
    const key = appIds.join(',')

    if (key !== previousTerminal.current.join(',')) {
      previousTerminal.current = appIds
      void queryClient.invalidateQueries({ queryKey: applicationsQueryKey })
    }

    const timer = setTimeout(() => {
      useInstallOperations.getState().removeOperations(appIds)
    }, 1200)

    return () => clearTimeout(timer)
  }, [operations, queryClient])

  return null
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