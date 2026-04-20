import { createHttpClient } from '@/api/httpClient'
import { HostDraft, mergeHosts } from '@/api/hosts'
import { createSession, deleteSession, listSessions } from '@/api/sessions'
import { HostItem, normalizeHostUrl, parseHostUrl } from '@/models/host'
import { SessionItem } from '@/models/session'
import { discoverHosts } from '@/bridge/discovery'
import {
  addSavedHost,
  clearHostToken,
  loadDefaultAuthToken,
  loadDefaultFontScale,
  loadDefaultServerUrl,
  loadHostToken,
  loadSavedHosts,
  removeSavedHost,
  saveDefaultAuthToken,
  saveDefaultFontScale,
  saveDefaultServerUrl,
  saveHostToken,
} from '@/bridge/secure-storage'
import { OpenTerminalSessionRequest } from '@/bridge/terminal/types'

export type AppScreen = 'hosts' | 'sessions' | 'settings' | 'terminal'

export type AppState = {
  screen: AppScreen
  hosts: HostItem[]
  sessions: SessionItem[]
  selectedHost: HostItem | null
  defaultServerUrl: string
  defaultAuthToken: string
  defaultFontScale: number
  hostError: string
  sessionError: string
  loading: boolean
  terminalRequest: OpenTerminalSessionRequest | null
}

export function createInitialAppState(): AppState {
  return {
    screen: 'hosts',
    hosts: [],
    sessions: [],
    selectedHost: null,
    defaultServerUrl: '',
    defaultAuthToken: '',
    defaultFontScale: 1,
    hostError: '',
    sessionError: '',
    loading: false,
    terminalRequest: null,
  }
}

export async function loadAppState(): Promise<AppState> {
  const state = createInitialAppState()
  state.defaultServerUrl = await loadDefaultServerUrl()
  state.defaultAuthToken = await loadDefaultAuthToken()
  state.defaultFontScale = await loadDefaultFontScale()
  state.hosts = await refreshHosts(state.defaultServerUrl, state.defaultAuthToken)
  return state
}

export async function refreshHosts(defaultServerUrl: string, defaultAuthToken: string): Promise<HostItem[]> {
  const savedHosts = await loadSavedHosts()
  const discoveredHosts = await discoverHosts()
  const drafts: HostDraft[] = []

  for (const host of savedHosts) {
    drafts.push({
      label: host.label,
      url: host.url,
      status: '수동 추가',
      tokenState: (await loadHostToken(normalizeHostUrl(host.url))) ? 'cached' : 'missing',
      source: { saved: true, defaultConfigured: false, discovered: false },
    })
  }

  if (defaultServerUrl.trim()) {
    drafts.push({
      label: labelFromUrl(defaultServerUrl),
      url: defaultServerUrl,
      status: '수동 기본값',
      tokenState: defaultAuthToken.trim() ? 'cached' : 'missing',
      source: { saved: false, defaultConfigured: true, discovered: false },
    })
  }

  for (const host of discoveredHosts) {
    drafts.push({
      label: host.label,
      url: host.url,
      status: '자동 감지',
      tokenState: (await loadHostToken(normalizeHostUrl(host.url))) ? 'cached' : 'missing',
      source: { saved: false, defaultConfigured: false, discovered: true },
    })
  }

  return mergeHosts(drafts)
}

export async function openHost(host: HostItem, defaultAuthToken: string): Promise<{ sessions: SessionItem[]; sessionError: string }> {
  const token = (await loadHostToken(host.url)) ?? defaultAuthToken
  const client = createHttpClient(host.url)
  try {
    const sessions = await listSessions(client, token)
    return { sessions, sessionError: '' }
  } catch (error) {
    const message = errorMessage(error)
    if (message === 'authorization required' || message === 'wrong authorization token') {
      await clearHostToken(host.url)
      return { sessions: [], sessionError: message === 'wrong authorization token' ? '(wrong authorization token)' : '(authorization required)' }
    }
    return { sessions: [], sessionError: message || '(connection failed)' }
  }
}

export async function createSessionForHost(host: HostItem, existing: SessionItem[], defaultAuthToken: string) {
  const token = (await loadHostToken(host.url)) ?? defaultAuthToken
  const client = createHttpClient(host.url)
  try {
    const created = await createSession(client, existing, token)
    const sessions = await listSessions(client, token)
    return { created, sessions, sessionError: '' }
  } catch (error) {
    const sessionError = await mapSessionError(host, error)
    return { created: '', sessions: [], sessionError }
  }
}

export async function deleteSessionForHost(host: HostItem, name: string, defaultAuthToken: string) {
  const token = (await loadHostToken(host.url)) ?? defaultAuthToken
  const client = createHttpClient(host.url)
  try {
    await deleteSession(client, name, token)
    return { sessions: await listSessions(client, token), sessionError: '' }
  } catch (error) {
    const sessionError = await mapSessionError(host, error)
    return { sessions: [], sessionError }
  }
}

export async function saveSettings(serverUrl: string, authToken: string, fontScale: number) {
  await saveDefaultServerUrl(serverUrl.trim())
  await saveDefaultAuthToken(authToken.trim())
  await saveDefaultFontScale(fontScale)
}

export async function saveManualHost(url: string, token: string) {
  const normalized = normalizeHostUrl(url)
  await addSavedHost({ label: labelFromUrl(normalized), url: normalized })
  if (token.trim()) {
    await saveHostToken(normalized, token.trim())
  }
}

export async function removeManualHost(url: string) {
  await removeSavedHost(normalizeHostUrl(url))
}

export async function terminalRequestForSession(host: HostItem, sessionName: string, defaultAuthToken: string, defaultFontScale: number) {
  const token = (await loadHostToken(host.url)) ?? defaultAuthToken
  return {
    hostUrl: host.url,
    authToken: token,
    sessionName,
    hostLabel: host.label,
    theme: 'dark' as const,
    fontScale: defaultFontScale,
  }
}

async function mapSessionError(host: HostItem, error: unknown) {
  const message = errorMessage(error)
  if (message === 'authorization required' || message === 'wrong authorization token') {
    await clearHostToken(host.url)
    return message === 'wrong authorization token' ? '(wrong authorization token)' : '(authorization required)'
  }
  return message || '(connection failed)'
}

function errorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message.trim()
  }
  return String(error ?? '').trim()
}

function labelFromUrl(raw: string) {
  const parsed = parseHostUrl(normalizeHostUrl(raw))
  return `# ${parsed?.hostname ?? raw}`
}
