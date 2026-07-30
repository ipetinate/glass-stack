const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

export function glassAPIURL(path: string) {
  const normalizedBase = API_BASE_URL.replace(/\/+$/, '')
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return new URL(`${normalizedBase}${normalizedPath}`, window.location.origin)
}

export class GlassAPIError extends Error {
  status: number
  code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'GlassAPIError'
    this.status = status
    this.code = code
  }
}

export function readCookie(name: string) {
  const prefix = `${encodeURIComponent(name)}=`
  return document.cookie
    .split('; ')
    .find((part) => part.startsWith(prefix))
    ?.slice(prefix.length)
}

export async function glassRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
  const csrf = readCookie('glass_csrf')
  if (csrf && !['GET', 'HEAD', 'OPTIONS'].includes(init.method ?? 'GET')) {
    headers.set('X-CSRF-Token', decodeURIComponent(csrf))
  }
  const response = await fetch(glassAPIURL(path), {
    ...init,
    credentials: 'include',
    headers,
  })
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      code?: string
      message?: string
    } | null
    throw new GlassAPIError(
      response.status,
      body?.code ?? 'request_failed',
      body?.message ?? `Request failed with status ${response.status}.`,
    )
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}
