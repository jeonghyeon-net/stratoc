const mockNativeRequest = jest.fn()

jest.mock('react-native', () => ({
  NativeModules: {
    ApiModule: {
      request: (...args: unknown[]) => mockNativeRequest(...args),
    },
  },
}))

import { createHttpClient } from './httpClient'

beforeEach(() => {
  mockNativeRequest.mockReset()
})

it('uses native api module when available', async () => {
  mockNativeRequest.mockResolvedValue({ status: 200, body: JSON.stringify([{ name: 'alpha' }]) })

  const client = createHttpClient('10.0.0.2:62589', (async () => {
    throw new Error('fetch fallback should not run')
  }) as typeof fetch)

  await expect(client.get('/api/sessions', 'secret')).resolves.toEqual([{ name: 'alpha' }])
  expect(mockNativeRequest).toHaveBeenCalledWith({
    baseUrl: 'https://10.0.0.2:62589',
    path: '/api/sessions',
    method: 'GET',
    token: 'secret',
    body: undefined,
  })
})

it('rejects non-https base urls', () => {
  expect(() => createHttpClient('http://10.0.0.2:62589')).toThrow('https required')
})

it('surfaces api error payloads', async () => {
  mockNativeRequest.mockResolvedValue({ status: 401, body: JSON.stringify({ error: 'authorization required' }) })
  const client = createHttpClient('https://10.0.0.2:62589', (async () => {
    return new Response(JSON.stringify({ error: 'authorization required' }), { status: 401 })
  }) as typeof fetch)

  await expect(client.get('/api/sessions')).rejects.toThrow('authorization required')
})
