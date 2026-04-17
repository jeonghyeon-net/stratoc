import { NativeEventEmitter, NativeModules, EmitterSubscription } from 'react-native'
import { OpenTerminalSessionRequest, TerminalSessionEvent } from './types'

const terminalModule = NativeModules.TerminalModule as
  | {
      openTerminalSession(request: OpenTerminalSessionRequest): Promise<void>
      addListener?(eventName: string): void
      removeListeners?(count: number): void
    }
  | undefined

const emitter = terminalModule?.addListener && terminalModule?.removeListeners
  ? new NativeEventEmitter(terminalModule as never)
  : null

export function openTerminalSession(request: OpenTerminalSessionRequest): Promise<void> {
  if (!terminalModule) {
    return Promise.reject(new Error('terminal module unavailable'))
  }
  return terminalModule.openTerminalSession(request)
}

export function subscribeTerminalEvents(
  listener: (event: TerminalSessionEvent) => void,
): EmitterSubscription {
  if (!emitter) {
    return { remove() {} } as EmitterSubscription
  }
  return emitter.addListener('terminalEvent', listener)
}
