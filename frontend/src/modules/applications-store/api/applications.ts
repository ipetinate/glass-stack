import { glassRequest } from '@/lib/glass-api'

import type {
  ApplicationDetail,
  ApplicationSummary,
  InstallOperation,
  InstallRequest,
  InstalledApplication,
  PaginatedResponse,
  ReviewSession,
} from '../types'

export function getApplications(filters?: {
  q?: string
  category?: string
  sort?: string
  offset?: number
  limit?: number
}): Promise<PaginatedResponse<ApplicationSummary>> {
  const params = new URLSearchParams()
  if (filters?.q) params.set('q', filters.q)
  if (filters?.category && filters.category !== 'all') params.set('category', filters.category)
  if (filters?.sort) params.set('sort', filters.sort)
  if (filters?.offset !== undefined) params.set('offset', String(filters.offset))
  if (filters?.limit !== undefined) params.set('limit', String(filters.limit))
  const query = params.toString()
  return glassRequest(`/api/v1/catalog/apps${query ? `?${query}` : ''}`)
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

export function editReview(
  appId: string,
  payload: { commentId: string; comment: string },
) {
  return glassRequest<ApplicationDetail>(
    `/api/v1/catalog/apps/${appId}/reviews`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
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

export async function startApplicationInstall(
  request: InstallRequest,
): Promise<InstallOperation> {
  const response = await glassRequest<{ data: InstallOperation }>(
    '/api/v1/apps/install',
    {
      method: 'POST',
      body: JSON.stringify(request),
    },
  )
  return response.data
}

export async function getInstallOperation(
  operationId: string,
): Promise<InstallOperation> {
  const response = await glassRequest<{ data: InstallOperation }>(
    `/api/v1/apps/install/${operationId}`,
  )
  return response.data
}

export type InstalledAppsResponse = {
  data: InstalledApplication[]
}

export function getInstalledApps(): Promise<InstalledAppsResponse> {
  return glassRequest<InstalledAppsResponse>('/api/v1/apps')
}

export type RemoveInstalledAppRequest = {
  containers?: boolean
  images?: boolean
  config?: boolean
  data?: boolean
}

export async function removeInstalledApp(
  appId: string,
  request: RemoveInstalledAppRequest = {},
): Promise<InstallOperation> {
  const response = await glassRequest<{ data: InstallOperation }>(
    `/api/v1/apps/${appId}/remove`,
    {
      method: 'POST',
      body: JSON.stringify(request),
    },
  )
  return response.data
}

export async function updateInstalledApp(appId: string): Promise<InstallOperation> {
  const response = await glassRequest<{ data: InstallOperation }>(
    `/api/v1/apps/${appId}/update`,
    { method: 'POST' },
  )
  return response.data
}

export async function editInstalledApp(
  appId: string,
  mode: string,
  options: InstallOptions,
): Promise<InstallOperation> {
  const response = await glassRequest<{ data: InstallOperation }>(
    `/api/v1/apps/${appId}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ mode, options }),
    },
  )
  return response.data
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

