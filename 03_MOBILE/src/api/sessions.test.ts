import { createSession, listSessions } from './sessions'

it('maps created_at payload into createdAt model', async () => {
  const client = {
    async get() {
      return [{ name: 'alpha', attached: 1, windows: 1, created_at: '2026-01-01T00:00:00Z' }]
    },
  }
  await expect(listSessions(client as never, 'secret')).resolves.toEqual([
    { name: 'alpha', title: undefined, attached: 1, windows: 1, createdAt: '2026-01-01T00:00:00Z' },
  ])
})

it('retries create with fallback name on invalid empty name', async () => {
  const calls: Array<Record<string, unknown>> = []
  const client = {
    async post(_path: string, body: Record<string, unknown>) {
      calls.push(body)
      if (calls.length === 1) {
        throw new Error('invalid session name: ""')
      }
      return { created: 'session-0001' }
    },
  }
  await expect(createSession(client as never, [], 'secret')).resolves.toBe('session-0001')
  expect(calls).toEqual([{ name: '' }, { name: 'session-0001' }])
})
