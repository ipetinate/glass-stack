import { glassRequest } from '@/lib/glass-api'

import type {
  ApplicationDetail,
  ApplicationSummary,
  InstallOperation,
  InstallRequest,
  ReviewSession,
} from '../types'

export function getApplications(filters?: { q?: string; category?: string; sort?: string }) {
  const params = new URLSearchParams()
  if (filters?.q) params.set('q', filters.q)
  if (filters?.category && filters.category !== 'all') params.set('category', filters.category)
  if (filters?.sort) params.set('sort', filters.sort)
  const query = params.toString()
  return glassRequest<ApplicationSummary[]>(`/api/v1/catalog/apps${query ? `?${query}` : ''}`)
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

export function getReviewSession() {
  return glassRequest<ReviewSession>('/api/v1/store/reviews/session')
}

export function startReviewLogin(provider: 'github' | 'google') {
  return glassRequest<ReviewSession>('/api/v1/store/reviews/session', {
    method: 'POST',
    body: JSON.stringify({ provider }),
  })
}

export function cancelReviewLogin() {
  return glassRequest<ReviewSession>('/api/v1/store/reviews/session', {
    method: 'DELETE',
  })
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

