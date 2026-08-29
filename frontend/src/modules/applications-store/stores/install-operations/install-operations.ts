import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { InstallOperation } from '../../types'

export type InstallOperationRecord = InstallOperation & {
  updatedAt: number
}

export function isTerminalOperation(status: InstallOperation['status']): boolean {
  return status === 'installed' || status === 'removed' || status === 'error'
}

export function isRunningOperation(status: InstallOperation['status']): boolean {
  return status === 'queued' || status === 'installing' || status === 'updating' || status === 'editing' || status === 'removing'
}

type InstallOperationsState = {
  operations: Record<string, InstallOperationRecord>
  upsertOperation: (operation: InstallOperation) => void
  removeOperation: (appId: string) => void
  removeOperations: (appIds: string[]) => void
}

function keepActive(operations: Record<string, InstallOperationRecord>) {
  return Object.fromEntries(
    Object.values(operations)
      .filter((operation) => !isTerminalOperation(operation.status))
      .map((operation) => [operation.appId, operation]),
  )
}

export const useInstallOperations = create<InstallOperationsState>()(
  persist(
    (set) => ({
      operations: {},
      upsertOperation: (operation) =>
        set((state) => ({
          operations: {
            ...state.operations,
            [operation.appId]: { ...operation, updatedAt: Date.now() },
          },
        })),
      removeOperation: (appId) =>
        set((state) => {
          const { [appId]: _dropped, ...rest } = state.operations
          return { operations: rest }
        }),
      removeOperations: (appIds) =>
        set((state) => {
          const dropped = new Set(appIds)
          return {
            operations: Object.fromEntries(
              Object.entries(state.operations).filter(([appId]) => !dropped.has(appId)),
            ),
          }
        }),
    }),
    {
      name: 'glass.install-operations',
      partialize: (state) => ({ operations: keepActive(state.operations) }),
    },
  ),
)