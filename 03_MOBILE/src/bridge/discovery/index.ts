import { NativeModules } from 'react-native'

export type DiscoveredHost = {
  url: string
  label: string
}

type DiscoveryModule = {
  discoverHosts(): Promise<DiscoveredHost[]>
}

export async function discoverHosts(): Promise<DiscoveredHost[]> {
  const module = NativeModules.DiscoveryModule as Partial<DiscoveryModule> | undefined
  if (!module?.discoverHosts) {
    return []
  }
  return module.discoverHosts()
}
