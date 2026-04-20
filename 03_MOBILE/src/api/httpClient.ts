import { NativeModules } from 'react-native'
import { normalizeHostUrl, parseHostUrl } from '@/models/host'

export type HttpClient = {
  get<T>(path: string, token?: string): Promise<T>
  post<T>(path: string, body: unknown, token?: string): Promise<T>
  delete(path: string, token?: string): Promise<void>
}

export type FetchLike = typeof fetch

type NativeApiModule = {
  request(payload: { baseUrl: string; path: string; method: 'GET' | 'POST' | 'DELETE'; token?: string; body?: string }): Promise<{ status: number; body: string }>
}

export function createHttpClient(baseUrl: string, fetchImpl: FetchLike = fetch): HttpClient {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl)
  return {
    get<T>(path: string, token?: string) {
      return request<T>(fetchImpl, normalizedBaseUrl, 'GET', path, undefined, token)
    },
    post<T>(path: string, body: unknown, token?: string) {
      return request<T>(fetchImpl, normalizedBaseUrl, 'POST', path, body, token)
    },
    delete(path: string, token?: string) {
      return request<void>(fetchImpl, normalizedBaseUrl, 'DELETE', path, undefined, token)
    },
  }
}

async function request<T>(
  fetchImpl: FetchLike,
  baseUrl: string,
  method: 'GET' | 'POST' | 'DELETE',
  path: string,
  body?: unknown,
  token?: string,
): Promise<T> {
  const headers = new Headers()
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  if (body !== undefined) {
    headers.set('Content-Type', 'application/json')
  }

  const native = nativeApiModule()
  if (native) {
    const response = await native.request({
      baseUrl,
      path,
      method,
      token,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    if (response.status < 200 || response.status >= 300) {
      throw readNativeError(response)
    }
    if (method === 'DELETE' || response.status === 204 || response.body.trim() === '') {
      return undefined as T
    }
    return JSON.parse(response.body) as T
  }

  const response = await fetchImpl(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  if (!response.ok) {
    throw await readError(response)
  }
  if (method === 'DELETE' || response.status === 204) {
    return undefined as T
  }
  return (await response.json()) as T
}

function nativeApiModule(): NativeApiModule | null {
  const module = NativeModules.ApiModule as Partial<NativeApiModule> | undefined
  if (!module?.request) {
    return null
  }
  return module as NativeApiModule
}

async function readError(response: Response) {
  try {
    const payload = (await response.json()) as { error?: string }
    if (payload.error) {
      return new Error(payload.error)
    }
  } catch {
    const text = await response.text().catch(() => '')
    if (text.trim()) {
      return new Error(text.trim())
    }
  }
  return new Error(`unexpected status: ${response.status}`)
}

function readNativeError(response: { status: number; body: string }) {
  try {
    const payload = JSON.parse(response.body) as { error?: string }
    if (payload.error) {
      return new Error(payload.error)
    }
  } catch {
    if (response.body.trim()) {
      return new Error(response.body.trim())
    }
  }
  return new Error(`unexpected status: ${response.status}`)
}

function normalizeBaseUrl(raw: string) {
  const value = raw.trim()
  if (!value) {
    throw new Error('base url missing')
  }
  const normalized = normalizeHostUrl(value)
  const parsed = parseHostUrl(normalized)
  if (!parsed || parsed.scheme !== 'https:') {
    throw new Error(`https required: ${normalized}`)
  }
  return normalized
}
