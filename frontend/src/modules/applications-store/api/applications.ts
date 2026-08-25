import { glassRequest } from '@/lib/glass-api'

import type {
  ApplicationDetail,
  ApplicationSummary,
  InstallOperation,
  InstallRequest,
} from '../types'

export function getApplications() {
  return glassRequest<ApplicationSummary[]>('/api/v1/catalog/apps')
}

export function getApplication(appId: string) {
  return glassRequest<ApplicationDetail>(`/api/v1/catalog/apps/${appId}`)
}

export function createReview(
  appId: string,
  review: { rating: number; comment: string },
) {
  return glassRequest<ApplicationDetail>(
    `/api/v1/catalog/apps/${appId}/reviews`,
    {
      method: 'POST',
      body: JSON.stringify(review),
    },
  )
}

export function startApplicationInstall(request: InstallRequest) {
  return glassRequest<InstallOperation>('/api/v1/apps/install', {
    method: 'POST',
    body: JSON.stringify(request),
  })
}

export function getInstallOperation(operationId: string) {
  return glassRequest<InstallOperation>(
    `/api/v1/apps/install/${operationId}`,
  )
}

export type StoreSyncSummary = {
  commit: string
  added: number
  updated: number
  removed: number
  unchanged: boolean
}

export function syncStoreCatalog() {
  return glassRequest<StoreSyncSummary>('/api/v1/store/sync', {
    method: 'POST',
  })
}

