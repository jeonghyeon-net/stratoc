import {
  addSavedHost,
  clearHostToken,
  loadDefaultAuthToken,
  loadDefaultServerUrl,
  loadHostToken,
  loadSavedHosts,
  resetMemoryStorage,
  saveDefaultAuthToken,
  saveDefaultServerUrl,
  saveHostToken,
} from './index'

beforeEach(() => {
  resetMemoryStorage()
})

it('persists default settings in fallback storage', async () => {
  await saveDefaultServerUrl('https://10.0.0.2:62589')
  await saveDefaultAuthToken('secret')

  await expect(loadDefaultServerUrl()).resolves.toBe('https://10.0.0.2:62589')
  await expect(loadDefaultAuthToken()).resolves.toBe('secret')
})

it('persists per-host token and clears it', async () => {
  await saveHostToken('https://10.0.0.2:62589', 'abc')
  await expect(loadHostToken('https://10.0.0.2:62589')).resolves.toBe('abc')

  await clearHostToken('https://10.0.0.2:62589')
  await expect(loadHostToken('https://10.0.0.2:62589')).resolves.toBeNull()
})

it('stores saved hosts without duplicates', async () => {
  await addSavedHost({ label: '# alpha', url: 'https://10.0.0.2:62589' })
  await addSavedHost({ label: '# alpha-2', url: 'https://10.0.0.2:62589' })

  await expect(loadSavedHosts()).resolves.toEqual([
    { label: '# alpha-2', url: 'https://10.0.0.2:62589' },
  ])
})
