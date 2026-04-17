export type OpenTerminalSessionRequest = {
  hostUrl: string
  authToken: string
  sessionName: string
  hostLabel?: string
  theme: 'system' | 'dark' | 'light'
  fontScale: number
}

export type TerminalSessionEvent =
  | { type: 'opened'; sessionName: string }
  | { type: 'closed'; reason: 'user' | 'remote' | 'error' }
  | { type: 'disconnected'; retrying: boolean; message?: string }
  | { type: 'auth-error' }
  | { type: 'session-not-found' }
  | { type: 'certificate-changed'; hostUrl: string }
