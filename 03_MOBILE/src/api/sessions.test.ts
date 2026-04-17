import { createSession } from './sessions'

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
