import { NativeEventEmitter, NativeModules, EmitterSubscription } from 'react-native'
import { OpenTerminalSessionRequest, TerminalSessionEvent } from './types'

const terminalModule = NativeModules.TerminalModule as
  | {
      openTerminalSession(request: OpenTerminalSessionRequest): Promise<void>
      sendInput(text: string): Promise<void>
      resize(columns: number, rows: number): Promise<void>
      close(reason?: string): Promise<void>
      addListener?(eventName: string): void
      removeListeners?(count: number): void
    }
  | undefined

const emitter = terminalModule?.addListener && terminalModule?.removeListeners
  ? new NativeEventEmitter(terminalModule as never)
  : null

export function hasNativeTerminalModule() {
  return Boolean(terminalModule)
}

export function openTerminalSession(request: OpenTerminalSessionRequest): Promise<void> {
  if (!terminalModule) {
    return Promise.reject(new Error('terminal module unavailable'))
  }
  return terminalModule.openTerminalSession(request)
}

export function sendTerminalInput(text: string): Promise<void> {
  if (!terminalModule) {
    return Promise.reject(new Error('terminal module unavailable'))
  }
  return terminalModule.sendInput(text)
}

export function resizeTerminalSession(columns: number, rows: number): Promise<void> {
  if (!terminalModule) {
    return Promise.reject(new Error('terminal module unavailable'))
  }
  return terminalModule.resize(columns, rows)
}

export function closeTerminalSession(reason?: string): Promise<void> {
  if (!terminalModule) {
    return Promise.reject(new Error('terminal module unavailable'))
  }
  return terminalModule.close(reason)
}

export function subscribeTerminalEvents(
  listener: (event: TerminalSessionEvent) => void,
): EmitterSubscription {
  if (!emitter) {
    return { remove() {} } as EmitterSubscription
  }
  return emitter.addListener('terminalEvent', listener)
}

export function subscribeTerminalOutput(
  listener: (payload: { data: string }) => void,
): EmitterSubscription {
  if (!emitter) {
    return { remove() {} } as EmitterSubscription
  }
  return emitter.addListener('terminalOutput', listener)
}
