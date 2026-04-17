import { mergeHostSources, normalizeHostUrl } from './host'

test('normalizeHostUrl adds https', () => {
  expect(normalizeHostUrl('10.0.0.2:8443')).toBe('https://10.0.0.2:8443')
})

test('mergeHostSources accumulates source flags', () => {
  expect(
    mergeHostSources(
      { saved: true, defaultConfigured: false, discovered: false },
      { saved: false, defaultConfigured: true, discovered: true },
    ),
  ).toEqual({ saved: true, defaultConfigured: true, discovered: true })
})
