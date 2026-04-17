import { NativeModules } from 'react-native'

const memory = new Map<string, string>()

const DEFAULT_SERVER_URL_KEY = 'settings/default-server-url'
const DEFAULT_AUTH_TOKEN_KEY = 'settings/default-auth-token'
const SAVED_HOSTS_KEY = 'hosts/saved'

type SavedHostRecord = {
  label: string
  url: string
}

type StorageModule = {
  getItem(key: string): Promise<string | null>
  setItem(key: string, value: string): Promise<void>
  removeItem(key: string): Promise<void>
}

function storageModule(): StorageModule | null {
  const module = NativeModules.SecureStorageModule as Partial<StorageModule> | undefined
  if (module?.getItem && module.setItem && module.removeItem) {
    return module as StorageModule
  }
  return null
}

async function getItem(key: string): Promise<string | null> {
  const module = storageModule()
  if (module) {
    return module.getItem(key)
  }
  return memory.get(key) ?? null
}

async function setItem(key: string, value: string): Promise<void> {
  const module = storageModule()
  if (module) {
    await module.setItem(key, value)
    return
  }
  memory.set(key, value)
}

async function removeItem(key: string): Promise<void> {
  const module = storageModule()
  if (module) {
    await module.removeItem(key)
    return
  }
  memory.delete(key)
}

function hostTokenKey(url: string) {
  return `hosts/token/${url.trim()}`
}

export async function loadHostToken(url: string): Promise<string | null> {
  return getItem(hostTokenKey(url))
}

export async function saveHostToken(url: string, token: string): Promise<void> {
  await setItem(hostTokenKey(url), token)
}

export async function clearHostToken(url: string): Promise<void> {
  await removeItem(hostTokenKey(url))
}

export async function loadDefaultServerUrl(): Promise<string> {
  return (await getItem(DEFAULT_SERVER_URL_KEY)) ?? ''
}

export async function saveDefaultServerUrl(url: string): Promise<void> {
  if (url.trim() === '') {
    await removeItem(DEFAULT_SERVER_URL_KEY)
    return
  }
  await setItem(DEFAULT_SERVER_URL_KEY, url)
}

export async function loadDefaultAuthToken(): Promise<string> {
  return (await getItem(DEFAULT_AUTH_TOKEN_KEY)) ?? ''
}

export async function saveDefaultAuthToken(token: string): Promise<void> {
  if (token.trim() === '') {
    await removeItem(DEFAULT_AUTH_TOKEN_KEY)
    return
  }
  await setItem(DEFAULT_AUTH_TOKEN_KEY, token)
}

export async function loadSavedHosts(): Promise<SavedHostRecord[]> {
  const raw = await getItem(SAVED_HOSTS_KEY)
  if (!raw) {
    return []
  }
  return JSON.parse(raw) as SavedHostRecord[]
}

export async function saveSavedHosts(hosts: SavedHostRecord[]): Promise<void> {
  await setItem(SAVED_HOSTS_KEY, JSON.stringify(hosts))
}

export async function addSavedHost(host: SavedHostRecord): Promise<void> {
  const items = await loadSavedHosts()
  const next = items.filter((item) => item.url !== host.url)
  next.push(host)
  await saveSavedHosts(next)
}

export async function removeSavedHost(url: string): Promise<void> {
  const items = await loadSavedHosts()
  await saveSavedHosts(items.filter((item) => item.url !== url))
  await clearHostToken(url)
}

export function resetMemoryStorage() {
  memory.clear()
}
