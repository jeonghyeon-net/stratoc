export type OpenTerminalSessionRequest = {
  hostUrl: string
  authToken: string
  sessionName: string
  hostLabel?: string
  theme: 'system' | 'dark' | 'light'
  fontScale: number
  columns?: number
  rows?: number
}

export type TerminalSessionEvent =
  | { type: 'opened'; sessionName: string; hostUrl?: string }
  | { type: 'closed'; reason: 'user' | 'remote' | 'error'; sessionName?: string; hostUrl?: string; message?: string }
  | { type: 'disconnected'; retrying: boolean; message?: string; sessionName?: string; hostUrl?: string }
  | { type: 'auth-error'; sessionName?: string; hostUrl?: string }
  | { type: 'session-not-found'; sessionName?: string; hostUrl?: string }
  | { type: 'certificate-changed'; hostUrl: string; sessionName?: string }
  | { type: 'soft-ctrl-state'; armed: boolean; sessionName?: string; hostUrl?: string }
