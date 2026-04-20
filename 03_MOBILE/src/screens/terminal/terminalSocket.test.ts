import { createTerminalSocket } from './terminalSocket'

class MockWebSocket {
  static instances: MockWebSocket[] = []
  binaryType = 'blob'
  onopen?: () => void
  onmessage?: (event: { data: unknown }) => void
  onerror?: () => void
  onclose?: () => void
  sent: unknown[] = []

  constructor(public readonly url: string, _protocols?: string | string[], public readonly options?: { headers?: Record<string, string> }) {
    MockWebSocket.instances.push(this)
  }

  send(value: unknown) {
    this.sent.push(value)
  }

  close() {
    this.onclose?.()
  }
}

beforeEach(() => {
  MockWebSocket.instances.length = 0
})

it('builds wss attach url and sends resize control', () => {
  const socket = createTerminalSocket(
    {
      hostUrl: 'https://10.0.0.2:62589',
      authToken: 'secret',
      sessionName: 'session-0001',
      theme: 'system',
      fontScale: 1,
    },
    MockWebSocket as unknown as typeof WebSocket,
  )
  socket.connect()
  socket.sendInput('ls\n')
  socket.sendResize(120, 40)

  const instance = MockWebSocket.instances[0]
  expect(instance.url).toBe('wss://10.0.0.2:62589/api/sessions/session-0001/attach')
  expect(instance.options?.headers).toEqual({ Authorization: 'Bearer secret' })
  expect(instance.sent).toContain(JSON.stringify({ type: 'resize', columns: 120, rows: 40 }))
  expect(instance.sent[0]).toBeInstanceOf(ArrayBuffer)
})

it('forwards output and disconnect control', () => {
  const output = jest.fn()
  const disconnect = jest.fn()
  const socket = createTerminalSocket(
    {
      hostUrl: 'https://10.0.0.2:62589',
      authToken: 'secret',
      sessionName: 'session-0001',
      theme: 'system',
      fontScale: 1,
    },
    MockWebSocket as unknown as typeof WebSocket,
  )
  socket.onOutput(output)
  socket.onDisconnect(disconnect)
  socket.connect()

  const instance = MockWebSocket.instances[0]
  instance.onmessage?.({ data: new Uint8Array([104, 101, 108, 108, 111]).buffer })
  instance.onmessage?.({ data: JSON.stringify({ type: 'disconnect', reason: 'taken over' }) })

  expect(output).toHaveBeenCalledWith('hello')
  expect(disconnect).toHaveBeenCalledWith('taken over')
})
