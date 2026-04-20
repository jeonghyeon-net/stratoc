import React from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { TerminalScreen } from './TerminalScreen'

const mockOpenTerminalSession = jest.fn().mockResolvedValue(undefined)
const mockSendTerminalInput = jest.fn().mockResolvedValue(undefined)
const mockResizeTerminalSession = jest.fn().mockResolvedValue(undefined)
const mockCloseTerminalSession = jest.fn().mockResolvedValue(undefined)
let terminalEventListener: ((event: { type: string; message?: string }) => void) | null = null

jest.mock('@/bridge/terminal', () => ({
  hasNativeTerminalModule: () => true,
  openTerminalSession: (...args: unknown[]) => mockOpenTerminalSession(...args),
  sendTerminalInput: (...args: unknown[]) => mockSendTerminalInput(...args),
  resizeTerminalSession: (...args: unknown[]) => mockResizeTerminalSession(...args),
  closeTerminalSession: (...args: unknown[]) => mockCloseTerminalSession(...args),
  subscribeTerminalEvents: (listener: (event: { type: string; message?: string }) => void) => {
    terminalEventListener = listener
    return { remove: jest.fn() }
  },
  subscribeTerminalOutput: () => ({ remove: jest.fn() }),
}))

jest.mock('./XtermWebView', () => {
  const React = require('react')
  const { View } = require('react-native')

  const XtermWebView = React.forwardRef((props: Record<string, unknown>, ref: React.ForwardedRef<unknown>) => {
    React.useImperativeHandle(ref, () => ({
      write: jest.fn(),
      clear: jest.fn(),
      focus: jest.fn(),
      resize: jest.fn(),
      fit: jest.fn(),
    }))
    React.useEffect(() => {
      ;(props as { onInitialized?: () => void }).onInitialized?.()
    }, [props])
    return React.createElement(View, { testID: 'mock-xterm' })
  })

  return { XtermWebView }
})

beforeEach(() => {
  terminalEventListener = null
  mockOpenTerminalSession.mockClear()
  mockSendTerminalInput.mockClear()
  mockResizeTerminalSession.mockClear()
  mockCloseTerminalSession.mockClear()
})

it('opens native terminal session after viewport measured and removes fake input controls', async () => {
  render(
    <TerminalScreen
      request={{
        hostUrl: 'https://10.0.0.2:62589',
        authToken: 'secret',
        sessionName: 'session-0001',
        theme: 'system',
        fontScale: 1,
      }}
      onBack={jest.fn()}
    />,
  )

  fireEvent(screen.getByTestId('terminal-viewport'), 'layout', {
    nativeEvent: { layout: { width: 900, height: 540 } },
  })

  await waitFor(() => {
    expect(mockOpenTerminalSession).toHaveBeenCalledWith(expect.objectContaining({ columns: 100, rows: 30 }))
  })

  await waitFor(() => {
    expect(screen.getByTestId('terminal-status').props.children).toBe('connected')
  })

  expect(screen.queryByPlaceholderText('command')).toBeNull()
  expect(screen.queryByText('전송')).toBeNull()
})

it('returns to session list when server replaces terminal connection', async () => {
  const onSessionReplaced = jest.fn()
  render(
    <TerminalScreen
      request={{
        hostUrl: 'https://10.0.0.2:62589',
        authToken: 'secret',
        sessionName: 'session-0001',
        theme: 'system',
        fontScale: 1,
      }}
      onBack={jest.fn()}
      onSessionReplaced={onSessionReplaced}
    />,
  )

  fireEvent(screen.getByTestId('terminal-viewport'), 'layout', {
    nativeEvent: { layout: { width: 900, height: 540 } },
  })

  await waitFor(() => {
    expect(mockOpenTerminalSession).toHaveBeenCalled()
  })

  await act(async () => {
    terminalEventListener?.({ type: 'disconnected', message: 'replaced by newer connection' })
  })

  await waitFor(() => {
    expect(onSessionReplaced).toHaveBeenCalledWith('replaced by newer connection')
  })
})
