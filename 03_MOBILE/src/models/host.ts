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

const DEFAULT_SERVER_PORT = '62589'

export type ParsedHostUrl = {
  scheme: string
  authority: string
  host: string
  hostname: string
  port: string
}

export function normalizeHostUrl(raw: string) {
  const value = raw.trim()
  if (value === '') {
    return ''
  }
  const normalized = value.includes('://') ? value : `https://${value}`
  const parsed = parseHostUrl(normalized)
  if (!parsed?.hostname) {
    return normalized
  }
  return `${parsed.scheme}//${withPort(parsed.host, DEFAULT_SERVER_PORT)}`
}

export function parseHostUrl(raw: string): ParsedHostUrl | null {
  const match = /^(https?|wss?):\/\/([^/?#]+)/i.exec(raw.trim())
  if (!match) {
    return null
  }
  const scheme = `${match[1].toLowerCase()}:`
  const authority = stripUserInfo(match[2])
  if (authority.startsWith('[')) {
    const end = authority.indexOf(']')
    if (end <= 0) {
      return null
    }
    const host = authority.slice(0, end + 1)
    const hostname = authority.slice(1, end)
    const port = authority.slice(end + 1).replace(/^:/, '')
    return { scheme, authority, host, hostname, port }
  }
  const separator = authority.indexOf(':')
  if (separator < 0) {
    return { scheme, authority, host: authority, hostname: authority, port: '' }
  }
  const host = authority.slice(0, separator)
  const port = authority.slice(separator + 1)
  return { scheme, authority, host, hostname: host, port }
}

function stripUserInfo(authority: string) {
  const at = authority.lastIndexOf('@')
  return at >= 0 ? authority.slice(at + 1) : authority
}

function withPort(host: string, port: string) {
  return `${host}:${port}`
}

export function mergeHostSources(a: HostSource, b: HostSource): HostSource {
  return {
    saved: a.saved || b.saved,
    defaultConfigured: a.defaultConfigured || b.defaultConfigured,
    discovered: a.discovered || b.discovered,
  }
}
