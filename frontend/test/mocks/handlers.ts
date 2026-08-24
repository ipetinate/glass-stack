import { http, HttpResponse } from 'msw'

import { applications, getApplicationDetail } from './fixtures'

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
    return HttpResponse.json({
      id: `operation-${body.appId}`,
      appId: body.appId,
      status: 'installing',
      progress: 35,
      message: 'Preparando contêiner…',
    })
  }),
  http.get('/api/v1/apps/install/:operationId', ({ params }) =>
    HttpResponse.json({
      id: String(params.operationId),
      appId: 'jellyfin',
      status: 'installing',
      progress: 65,
      message: 'Baixando imagem…',
    }),
  ),
]

