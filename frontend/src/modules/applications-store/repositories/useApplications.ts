import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  getApplication,
  getApplications,
  getInstallOperation,
  startApplicationInstall,
  syncStoreCatalog,
} from '../api/applications'
import type { InstallRequest } from '../types'

export const applicationsQueryKey = ['applications-store', 'applications']

export function useApplications() {
  return useQuery({
    queryKey: applicationsQueryKey,
    queryFn: getApplications,
  })
}

export function useApplication(appId: string | undefined) {
  return useQuery({
    queryKey: [...applicationsQueryKey, appId],
    queryFn: () => getApplication(appId!),
    enabled: Boolean(appId),
  })
}

export function useInstallApplication() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: InstallRequest) => startApplicationInstall(request),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: applicationsQueryKey })
    },
  })
}

export function useSyncCatalog() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => syncStoreCatalog(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: applicationsQueryKey })
    },
  })
}

export function useInstallOperation(operationId: string | undefined) {
  return useQuery({
    queryKey: [...applicationsQueryKey, 'install', operationId],
    queryFn: () => getInstallOperation(operationId!),
    enabled: Boolean(operationId),
    refetchInterval: (query) =>
      query.state.data?.status === 'installing' ? 1000 : false,
  })
}

