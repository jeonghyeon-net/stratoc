export type HostSource = {
  saved: boolean
  defaultConfigured: boolean
  discovered: boolean
}

export type HostItem = {
  id: string
  label: string
  url: string
  status: string
  tokenState: 'missing' | 'cached'
  source: HostSource
}

export function normalizeHostUrl(raw: string) {
  const value = raw.trim()
  if (value === '') {
    return ''
  }
  return value.includes('://') ? value : `https://${value}`
}

export function mergeHostSources(a: HostSource, b: HostSource): HostSource {
  return {
    saved: a.saved || b.saved,
    defaultConfigured: a.defaultConfigured || b.defaultConfigured,
    discovered: a.discovered || b.discovered,
  }
}
