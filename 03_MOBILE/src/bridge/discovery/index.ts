export type DiscoveredHost = {
  url: string
  label: string
}

export async function discoverHosts(): Promise<DiscoveredHost[]> {
  return []
}
