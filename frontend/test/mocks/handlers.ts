import { http, HttpResponse } from 'msw'

import { installedApplications, applications, getApplicationDetail } from './fixtures'
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
    message: done ? 'Installation complete.' : 'Downloading image…',
  }
}

export const handlers = [
  http.get('/api/v1/catalog/apps', ({ request }) => {
    const url = new URL(request.url)
    const q = (url.searchParams.get('q') ?? '').toLowerCase()
    const category = url.searchParams.get('category') ?? ''
    const offset = parseInt(url.searchParams.get('offset') ?? '0', 10) || 0
    const limit = parseInt(url.searchParams.get('limit') ?? '20', 10) || 20
    let result = [...applications]
    if (q) {
      result = result.filter((app) =>
        [app.name, app.developer, app.description].join(' ').toLowerCase().includes(q),
      )
    }
    if (category && category !== 'all') {
      result = result.filter((app) => app.category === category)
    }
    const total = result.length
    const data = result.slice(offset, offset + limit)
    return HttpResponse.json({ data, total })
  }),
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
      data: {
        id: operationId,
        appId: body.appId,
        status: 'installing',
        progress: 20,
        message: 'Preparando contêiner…',
      },
    })
  }),
  http.get('/api/v1/apps/install/:operationId', ({ params }) =>
    HttpResponse.json({ data: buildOperation(String(params.operationId)) }),
  ),
  http.get('/api/v1/apps/events', () =>
    new HttpResponse(null, {
      headers: { 'Content-Type': 'text/event-stream' },
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(':\n\n'))
        },
      }),
    }),
  ),
  http.get('/api/v1/apps', () =>
    HttpResponse.json({ data: installedApplications }),
  ),
  http.post('/api/v1/apps/:appId/update', ({ params }) =>
    HttpResponse.json({
      data: {
        id: `operation-${params.appId}`,
        appId: params.appId,
        status: 'updating',
        progress: 20,
        message: 'Atualizando aplicativo…',
      },
    }),
  ),
  http.patch('/api/v1/apps/:appId', ({ params }) =>
    HttpResponse.json({
      data: {
        id: `operation-${params.appId}`,
        appId: params.appId,
        status: 'editing',
        progress: 20,
        message: 'Editando aplicativo…',
      },
    }),
  ),
  http.post('/api/v1/apps/:appId/remove', ({ params }) => {
    const appId = String(params.appId)
    const index = installedApplications.findIndex((app) => app.id === appId)
    if (index >= 0) installedApplications.splice(index, 1)
    return HttpResponse.json({
      data: {
        id: `operation-${appId}`,
        appId,
        status: 'removing',
        progress: 40,
        message: 'Removendo contêineres…',
      },
    })
  }),
  http.get('/api/v1/store/reviews/session', () =>
    HttpResponse.json({ status: 'idle' }),
  ),
  http.post('/api/v1/store/reviews/session', async ({ request }) => {
    const body = (await request.json()) as { provider?: string }
    return HttpResponse.json({
      status: 'pending',
      provider: body.provider ?? 'github',
      userCode: 'XXXX-XXXX',
      verificationUri:
        body.provider === 'google'
          ? 'https://google.com/device'
          : 'https://github.com/login/device',
    })
  }),
  http.delete('/api/v1/store/reviews/session', () =>
    HttpResponse.json({ status: 'idle' }),
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
  http.post('/api/v1/catalog/apps/:appId/reviews', async ({ request }) => {
    const body = (await request.json()) as { rating?: number; comment?: string }
    if (!body.rating || !body.comment) {
      return HttpResponse.json(
        { code: 'invalid_review', message: 'Informe uma nota de 1 a 5 estrelas e um comentário.' },
        { status: 400 },
      )
    }
    return HttpResponse.json({
      id: 'mock-app',
      name: 'Mock App',
      developer: '',
      description: '',
      category: 'Other',
      tags: [],
      iconSrc: '',
      screenshots: [],
      status: 'available',
      type: 'Docker Image',
      version: '1.0.0',
      architectures: [],
      requirements: [],
      reviews: [
        {
          id: 'gh-1',
          author: 'ipetinate',
          postedAt: new Date().toISOString(),
          snippet: body.comment,
          rating: body.rating,
        },
      ],
      longDescription: '',
    })
  }),
]
