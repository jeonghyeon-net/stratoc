import { createHttpClient } from '@/api/httpClient'
import { createSessionForHost, openHost, terminalRequestForSession } from './controller'
import { resetMemoryStorage, saveHostToken } from '@/bridge/secure-storage'

jest.mock('@/api/httpClient')
const createHttpClientMock = jest.mocked(createHttpClient)

beforeEach(() => {
  createHttpClientMock.mockReset()
  resetMemoryStorage()
})

it('clears host token state on unauthorized session load', async () => {
  await saveHostToken('https://10.0.0.2:62589', 'bad')
  createHttpClientMock.mockReturnValue({
    get: jest.fn().mockRejectedValue(new Error('authorization required')),
    post: jest.fn(),
    delete: jest.fn(),
  })

  await expect(
    openHost(
      {
        id: 'https://10.0.0.2:62589',
        label: '# 10.0.0.2:62589',
        url: 'https://10.0.0.2:62589',
        status: '자동 감지',
        tokenState: 'cached',
        source: { saved: false, defaultConfigured: false, discovered: true },
      },
      '',
    ),
  ).resolves.toEqual({ sessions: [], sessionError: '(authorization required)' })
})

it('creates session and reloads sessions', async () => {
  const post = jest.fn().mockResolvedValue({ created: 'session-0001' })
  const get = jest.fn().mockResolvedValue([{ name: 'session-0001', attached: 0, windows: 1, created_at: '2026-01-01T00:00:00Z' }])
  createHttpClientMock.mockReturnValue({ get, post, delete: jest.fn() })

  const result = await createSessionForHost(
    {
      id: 'https://10.0.0.2:62589',
      label: '# 10.0.0.2:62589',
      url: 'https://10.0.0.2:62589',
      status: '자동 감지',
      tokenState: 'missing',
      source: { saved: false, defaultConfigured: false, discovered: true },
    },
    [],
    'secret',
  )

  expect(result.created).toBe('session-0001')
  expect(result.sessionError).toBe('')
  expect(post).toHaveBeenCalled()
  expect(result.sessions).toEqual([
    { name: 'session-0001', title: undefined, attached: 0, windows: 1, createdAt: '2026-01-01T00:00:00Z' },
  ])
})

it('creates terminal request for selected host', async () => {
  await saveHostToken('https://10.0.0.2:62589', 'abc')

  await expect(
    terminalRequestForSession(
      {
        id: 'https://10.0.0.2:62589',
        label: '# 10.0.0.2:62589',
        url: 'https://10.0.0.2:62589',
        status: '자동 감지',
        tokenState: 'cached',
        source: { saved: false, defaultConfigured: false, discovered: true },
      },
      'session-0001',
      'fallback',
      1.15,
    ),
  ).resolves.toEqual({
    hostUrl: 'https://10.0.0.2:62589',
    authToken: 'abc',
    sessionName: 'session-0001',
    hostLabel: '# 10.0.0.2:62589',
    theme: 'dark',
    fontScale: 1.15,
  })
})
