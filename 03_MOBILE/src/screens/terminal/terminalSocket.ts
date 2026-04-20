import { OpenTerminalSessionRequest } from '@/bridge/terminal/types'
import { parseHostUrl } from '@/models/host'

type OutputListener = (chunk: string) => void
type VoidListener = () => void
type DisconnectListener = (reason?: string) => void

export type TerminalSocket = {
  connect(): void
  close(reason?: string): void
  sendInput(text: string): void
  sendResize(columns: number, rows: number): void
  onOpen(listener: VoidListener): void
  onOutput(listener: OutputListener): void
  onDisconnect(listener: DisconnectListener): void
}

export function createTerminalSocket(
  request: OpenTerminalSessionRequest,
  webSocketFactory: typeof WebSocket = WebSocket,
): TerminalSocket {
  let socket: WebSocket | null = null
  let openListener: VoidListener = () => {}
  let outputListener: OutputListener = () => {}
  let disconnectListener: DisconnectListener = () => {}

  const socketUrl = attachUrl(request.hostUrl, request.sessionName)
  const headers: Record<string, string> = { Authorization: `Bearer ${request.authToken}` }
  if (request.columns && request.rows) {
    headers['X-Terminal-Columns'] = String(request.columns)
    headers['X-Terminal-Rows'] = String(request.rows)
  }

  return {
    connect() {
      socket = new webSocketFactory(socketUrl, undefined, { headers })
      socket.onopen = () => openListener()
      socket.onmessage = (event) => {
        if (typeof event.data === 'string') {
          const control = parseControl(event.data)
          if (control?.type === 'disconnect') {
            disconnectListener(control.reason)
            return
          }
          outputListener(event.data)
          return
        }
        outputListener(decodeBinary(event.data))
      }
      socket.onerror = () => disconnectListener('socket error')
      socket.onclose = () => disconnectListener('closed')
    },
    close(reason) {
      socket?.close(1000, reason)
      socket = null
    },
    sendInput(text) {
      socket?.send(encodeText(text))
    },
    sendResize(columns, rows) {
      socket?.send(JSON.stringify({ type: 'resize', columns, rows }))
    },
    onOpen(listener) {
      openListener = listener
    },
    onOutput(listener) {
      outputListener = listener
    },
    onDisconnect(listener) {
      disconnectListener = listener
    },
  }
}

function attachUrl(hostUrl: string, sessionName: string) {
  const normalized = hostUrl.includes('://') ? hostUrl : `https://${hostUrl}`
  const parsed = parseHostUrl(normalized)
  if (!parsed || parsed.scheme !== 'https:') {
    throw new Error(`https required: ${hostUrl}`)
  }
  return `wss://${parsed.authority}/api/sessions/${encodeURIComponent(sessionName)}/attach`
}

function parseControl(value: string): { type?: string; reason?: string } | null {
  try {
    return JSON.parse(value) as { type?: string; reason?: string }
  } catch {
    return null
  }
}

function decodeBinary(value: unknown) {
  if (value instanceof ArrayBuffer) {
    return decodeBytes(new Uint8Array(value))
  }
  if (ArrayBuffer.isView(value)) {
    return decodeBytes(new Uint8Array(value.buffer, value.byteOffset, value.byteLength))
  }
  return String(value)
}

function decodeBytes(bytes: Uint8Array) {
  return String.fromCharCode(...bytes)
}

function encodeText(value: string) {
  const bytes = new Uint8Array(value.length)
  for (let index = 0; index < value.length; index += 1) {
    bytes[index] = value.charCodeAt(index)
  }
  return bytes.buffer
}
