jest.mock('react-native', () => ({
  NativeModules: {
    TerminalModule: {
      openTerminalSession: jest.fn().mockResolvedValue(undefined),
      addListener: jest.fn(),
      removeListeners: jest.fn(),
    },
  },
  NativeEventEmitter: class {
    addListener(_name: string, listener: (event: unknown) => void) {
      return { remove: jest.fn(), listener }
    }
  },
}))

import { openTerminalSession } from './index'

it('forwards request to native module', async () => {
  const request = {
    hostUrl: 'https://10.0.0.2:8443',
    authToken: 'secret',
    sessionName: 'session-0001',
    theme: 'dark' as const,
    fontScale: 1,
  }
  await expect(openTerminalSession(request)).resolves.toBeUndefined()
})
