import { SessionItem } from '@/models/session'
import { HttpClient } from './httpClient'

type SessionPayload = {
  name: string
  title?: string
  attached: number
  windows: number
  created_at: string
}

export async function listSessions(client: HttpClient, token: string) {
  const payload = await client.get<SessionPayload[]>('/api/sessions', token)
  return payload.map((item) => ({
    name: item.name,
    title: item.title,
    attached: item.attached,
    windows: item.windows,
    createdAt: item.created_at,
  })) satisfies SessionItem[]
}

export async function createSession(client: HttpClient, existing: SessionItem[], token: string) {
  try {
    const response = await client.post<{ created: string }>('/api/sessions', { name: '' }, token)
    return response.created
  } catch (error) {
    if ((error as Error).message !== 'invalid session name: ""') {
      throw error
    }
    const fallback = nextSessionName(existing)
    const response = await client.post<{ created: string }>('/api/sessions', { name: fallback }, token)
    return response.created
  }
}

export async function deleteSession(client: HttpClient, name: string, token: string) {
  await client.delete(`/api/sessions/${encodeURIComponent(name)}`, token)
}

export function nextSessionName(existing: SessionItem[]) {
  const next = existing.reduce((max, item) => Math.max(max, sessionNumber(item.name)), 0) + 1
  return `session-${String(next).padStart(4, '0')}`
}

function sessionNumber(name: string) {
  if (!name.startsWith('session-')) {
    return 0
  }
  const parsed = Number.parseInt(name.slice('session-'.length), 10)
  return Number.isNaN(parsed) ? 0 : parsed
}
