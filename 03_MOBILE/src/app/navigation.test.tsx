import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { AppNavigation } from './navigation'

jest.mock('./controller', () => ({
  createInitialAppState: () => ({
    screen: 'hosts',
    hosts: [],
    sessions: [],
    selectedHost: null,
    defaultServerUrl: '',
    defaultAuthToken: '',
    hostError: '',
    sessionError: '',
    loading: false,
    terminalRequest: null,
  }),
  loadAppState: jest.fn().mockResolvedValue({
    screen: 'hosts',
    hosts: [
      {
        id: 'https://10.0.0.2:62589',
        label: '# 10.0.0.2:62589',
        url: 'https://10.0.0.2:62589',
        status: '자동 감지',
        tokenState: 'missing',
        source: { saved: false, defaultConfigured: false, discovered: true },
      },
    ],
    sessions: [],
    selectedHost: null,
    defaultServerUrl: '',
    defaultAuthToken: '',
    hostError: '',
    sessionError: '',
    loading: false,
    terminalRequest: null,
  }),
  refreshHosts: jest.fn().mockResolvedValue([]),
  openHost: jest.fn().mockResolvedValue({ sessions: [], sessionError: '' }),
  createSessionForHost: jest.fn().mockResolvedValue({ created: 'session-0001', sessions: [], sessionError: '' }),
  deleteSessionForHost: jest.fn().mockResolvedValue({ sessions: [], sessionError: '' }),
  saveSettings: jest.fn().mockResolvedValue(undefined),
  saveManualHost: jest.fn().mockResolvedValue(undefined),
  removeManualHost: jest.fn().mockResolvedValue(undefined),
  terminalRequestForSession: jest.fn().mockResolvedValue({
    hostUrl: 'https://10.0.0.2:62589',
    authToken: 'secret',
    sessionName: 'session-0001',
    hostLabel: '# 10.0.0.2:62589',
    theme: 'system',
    fontScale: 1,
  }),
}))

it('renders discovered hosts from loaded app state', async () => {
  render(<AppNavigation />)

  await waitFor(() => {
    expect(screen.getByText('# 10.0.0.2:62589')).toBeTruthy()
  })
})

it('switches to settings tab', async () => {
  render(<AppNavigation />)
  fireEvent.press(screen.getByText('Settings'))
  await waitFor(() => {
    expect(screen.getByText('기본 서버')).toBeTruthy()
  })
})
