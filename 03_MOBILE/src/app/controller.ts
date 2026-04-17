import { createHttpClient } from '@/api/httpClient'
import { HostDraft, mergeHosts } from '@/api/hosts'
import { createSession, deleteSession, listSessions } from '@/api/sessions'
import { HostItem, normalizeHostUrl } from '@/models/host'
import { SessionItem } from '@/models/session'
import { discoverHosts } from '@/bridge/discovery'
import {
  addSavedHost,
  clearHostToken,
  loadDefaultAuthToken,
  loadDefaultServerUrl,
  loadHostToken,
  loadSavedHosts,
  removeSavedHost,
  saveDefaultAuthToken,
  saveDefaultServerUrl,
  saveHostToken,
} from '@/bridge/secure-storage'
import { openTerminalSession } from '@/bridge/terminal/index'

export type AppScreen = 'hosts' | 'sessions' | 'settings'

export type AppState = {
  screen: AppScreen
  hosts: HostItem[]
  sessions: SessionItem[]
  selectedHost: HostItem | null
  defaultServerUrl: string
  defaultAuthToken: string
  hostError: string
  sessionError: string
  loading: boolean
}

export function createInitialAppState(): AppState {
  return {
    screen: 'hosts',
    hosts: [],
    sessions: [],
    selectedHost: null,
    defaultServerUrl: '',
    defaultAuthToken: '',
    hostError: '',
    sessionError: '',
    loading: false,
  }
}

export async function loadAppState(): Promise<AppState> {
  const state = createInitialAppState()
  state.defaultServerUrl = await loadDefaultServerUrl()
  state.defaultAuthToken = await loadDefaultAuthToken()
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
    const message = (error as Error).message
    if (message === 'authorization required' || message === 'wrong authorization token') {
      await clearHostToken(host.url)
      return { sessions: [], sessionError: message === 'wrong authorization token' ? '(wrong authorization token)' : '(authorization required)' }
    }
    return { sessions: [], sessionError: '(connection failed)' }
  }
}

export async function createSessionForHost(host: HostItem, existing: SessionItem[], defaultAuthToken: string) {
  const token = (await loadHostToken(host.url)) ?? defaultAuthToken
  const client = createHttpClient(host.url)
  const created = await createSession(client, existing, token)
  const sessions = await listSessions(client, token)
  return { created, sessions }
}

export async function deleteSessionForHost(host: HostItem, name: string, defaultAuthToken: string) {
  const token = (await loadHostToken(host.url)) ?? defaultAuthToken
  const client = createHttpClient(host.url)
  await deleteSession(client, name, token)
  return listSessions(client, token)
}

export async function saveSettings(serverUrl: string, authToken: string) {
  await saveDefaultServerUrl(serverUrl.trim())
  await saveDefaultAuthToken(authToken.trim())
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

export async function connectToSession(host: HostItem, sessionName: string, defaultAuthToken: string) {
  const token = (await loadHostToken(host.url)) ?? defaultAuthToken
  await openTerminalSession({
    hostUrl: host.url,
    authToken: token,
    sessionName,
    hostLabel: host.label,
    theme: 'system',
    fontScale: 1,
  })
}

function labelFromUrl(raw: string) {
  const url = new URL(normalizeHostUrl(raw))
  return `# ${url.host}`
}
