import { HostItem, HostSource, mergeHostSources, normalizeHostUrl } from '@/models/host'

export type HostDraft = {
  label: string
  url: string
  status?: string
  tokenState?: 'missing' | 'cached'
  source: HostSource
}

export function mergeHosts(items: HostDraft[]) {
  const map = new Map<string, HostItem>()
  for (const item of items) {
    const url = normalizeHostUrl(item.url)
    const previous = map.get(url)
    if (!previous) {
      map.set(url, {
        id: url,
        label: item.label,
        url,
        status: item.status ?? '',
        tokenState: item.tokenState ?? 'missing',
        source: item.source,
      })
      continue
    }
    map.set(url, {
      ...previous,
      label: pickLabel(previous, item),
      status: pickStatus(previous.status, item.status ?? ''),
      tokenState: previous.tokenState === 'cached' || item.tokenState === 'cached' ? 'cached' : 'missing',
      source: mergeHostSources(previous.source, item.source),
    })
  }
  return [...map.values()]
}

function pickLabel(previous: HostItem, next: HostDraft) {
  if (previous.source.saved) {
    return previous.label
  }
  if (next.source.saved) {
    return next.label
  }
  if (previous.source.defaultConfigured) {
    return previous.label
  }
  if (next.source.defaultConfigured) {
    return next.label
  }
  return previous.label || next.label
}

function pickStatus(previous: string, next: string) {
  if (previous.startsWith('(')) {
    return previous
  }
  if (next.startsWith('(')) {
    return next
  }
  return previous || next
}
