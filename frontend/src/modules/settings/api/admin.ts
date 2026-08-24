import { glassRequest } from '@/lib/glass-api'

export const resetSystem = () =>
  glassRequest<{ status: string; message: string }>(
    '/api/v1/admin/reset',
    { method: 'POST' },
  )
