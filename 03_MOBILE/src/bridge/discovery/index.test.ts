jest.mock('react-native', () => ({
  NativeModules: {
    DiscoveryModule: {
      discoverHosts: jest.fn().mockResolvedValue([{ url: 'https://10.0.0.2:62589', label: '# 10.0.0.2:62589' }]),
    },
  },
}))

import { discoverHosts } from './index'

it('uses native discovery module when available', async () => {
  await expect(discoverHosts()).resolves.toEqual([
    { url: 'https://10.0.0.2:62589', label: '# 10.0.0.2:62589' },
  ])
})
