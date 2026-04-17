import { createHttpClient } from './httpClient'

it('adds auth header and parses json response', async () => {
  const client = createHttpClient('10.0.0.2:62589', (async (_input, init) => {
    expect(init?.headers).toBeInstanceOf(Headers)
    expect((init?.headers as Headers).get('Authorization')).toBe('Bearer secret')
    return new Response(JSON.stringify([{ name: 'alpha' }]), { status: 200 })
  }) as typeof fetch)

  await expect(client.get('/api/sessions', 'secret')).resolves.toEqual([{ name: 'alpha' }])
})

it('rejects non-https base urls', () => {
  expect(() => createHttpClient('http://10.0.0.2:62589')).toThrow('https required')
})

it('surfaces api error payloads', async () => {
  const client = createHttpClient('https://10.0.0.2:62589', (async () => {
    return new Response(JSON.stringify({ error: 'authorization required' }), { status: 401 })
  }) as typeof fetch)

  await expect(client.get('/api/sessions')).rejects.toThrow('authorization required')
})
