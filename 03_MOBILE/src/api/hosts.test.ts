import { mergeHosts } from './hosts'

it('merges duplicate host urls and accumulates source flags', () => {
  const items = mergeHosts([
    {
      label: '# saved',
      url: '10.0.0.2:8443',
      status: '수동 추가',
      tokenState: 'cached',
      source: { saved: true, defaultConfigured: false, discovered: false },
    },
    {
      label: '# discovered',
      url: 'https://10.0.0.2:8443',
      status: '자동 감지',
      tokenState: 'missing',
      source: { saved: false, defaultConfigured: false, discovered: true },
    },
  ])

  expect(items).toEqual([
    {
      id: 'https://10.0.0.2:62589',
      label: '# saved',
      url: 'https://10.0.0.2:62589',
      status: '수동 추가',
      tokenState: 'cached',
      source: { saved: true, defaultConfigured: false, discovered: true },
    },
  ])
})
