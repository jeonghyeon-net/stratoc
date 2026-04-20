const mockOpenTerminalSession = jest.fn().mockResolvedValue(undefined)
const mockSendInput = jest.fn().mockResolvedValue(undefined)
const mockResize = jest.fn().mockResolvedValue(undefined)
const mockClose = jest.fn().mockResolvedValue(undefined)

jest.mock('react-native', () => ({
  NativeModules: {
    TerminalModule: {
      openTerminalSession: (...args: unknown[]) => mockOpenTerminalSession(...args),
      sendInput: (...args: unknown[]) => mockSendInput(...args),
      resize: (...args: unknown[]) => mockResize(...args),
      close: (...args: unknown[]) => mockClose(...args),
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

import { closeTerminalSession, openTerminalSession, resizeTerminalSession, sendTerminalInput } from './index'

beforeEach(() => {
  mockOpenTerminalSession.mockClear()
  mockSendInput.mockClear()
  mockResize.mockClear()
  mockClose.mockClear()
})

it('forwards request to native module', async () => {
  const request = {
    hostUrl: 'https://10.0.0.2:8443',
    authToken: 'secret',
    sessionName: 'session-0001',
    theme: 'dark' as const,
    fontScale: 1,
  }
  await expect(openTerminalSession(request)).resolves.toBeUndefined()
  await expect(sendTerminalInput('ls\n')).resolves.toBeUndefined()
  await expect(resizeTerminalSession(120, 40)).resolves.toBeUndefined()
  await expect(closeTerminalSession('done')).resolves.toBeUndefined()

  expect(mockSendInput).toHaveBeenCalledWith('ls\n')
  expect(mockResize).toHaveBeenCalledWith(120, 40)
  expect(mockClose).toHaveBeenCalledWith('done')
})
