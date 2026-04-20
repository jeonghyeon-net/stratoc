import { mergeHostSources, normalizeHostUrl, parseHostUrl } from './host'

test('normalizeHostUrl adds https and resets default port', () => {
  expect(normalizeHostUrl('10.0.0.2:8443/path?x=1')).toBe('https://10.0.0.2:62589')
})

test('parseHostUrl reads hostname without URL api', () => {
  expect(parseHostUrl('https://10.0.0.2:62589/path?x=1')).toEqual({
    scheme: 'https:',
    authority: '10.0.0.2:62589',
    host: '10.0.0.2',
    hostname: '10.0.0.2',
    port: '62589',
  })
})

test('mergeHostSources accumulates source flags', () => {
  expect(
    mergeHostSources(
      { saved: true, defaultConfigured: false, discovered: false },
      { saved: false, defaultConfigured: true, discovered: true },
    ),
  ).toEqual({ saved: true, defaultConfigured: true, discovered: true })
})
