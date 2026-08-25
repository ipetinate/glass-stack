import { http, HttpResponse } from 'msw'

import { applications, getApplicationDetail } from './fixtures'
import type { InstallOperation } from '@/modules/applications-store/types'

const installProgress = new Map<string, number>()
const PROGRESS_STEP = 15

function buildOperation(operationId: string): InstallOperation {
  const appId = operationId.replace(/^operation-/, '')
  const current = installProgress.get(operationId) ?? 35
  const next = Math.min(current + PROGRESS_STEP, 100)
  installProgress.set(operationId, next)

  const done = next >= 100
  if (done) {
    const installed = applications.find((application) => application.id === appId)
    if (installed) installed.status = 'installed'
  }

  return {
    id: operationId,
    appId,
    status: done ? 'installed' : 'installing',
    progress: next,
    message: done ? 'Instalação concluída.' : 'Baixando imagem…',
  }
}

export const handlers = [
  http.get('/api/v1/catalog/apps', () => HttpResponse.json(applications)),
  http.get('/api/v1/catalog/apps/:appId', ({ params }) => {
    const application = getApplicationDetail(String(params.appId))
    return application
      ? HttpResponse.json(application)
      : HttpResponse.json({ code: 'not_found', message: 'Aplicativo não encontrado.' }, { status: 404 })
  }),
  http.post('/api/v1/apps/install', async ({ request }) => {
    const body = (await request.json()) as { appId: string }
    const operationId = `operation-${body.appId}`
    installProgress.set(operationId, 20)
    return HttpResponse.json({
      id: operationId,
      appId: body.appId,
      status: 'installing',
      progress: 20,
      message: 'Preparando contêiner…',
    })
  }),
  http.get('/api/v1/apps/install/:operationId', ({ params }) =>
    HttpResponse.json(buildOperation(String(params.operationId))),
  ),
  http.post('/api/v1/store/sync', () =>
    HttpResponse.json({
      commit: 'abc123def456',
      added: 0,
      updated: 0,
      removed: 0,
      unchanged: false,
    }),
  ),
]
