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

