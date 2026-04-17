import { NativeEventEmitter, NativeModules, EmitterSubscription } from 'react-native'
import { OpenTerminalSessionRequest, TerminalSessionEvent } from './types'

const { TerminalModule } = NativeModules
const emitter = new NativeEventEmitter(TerminalModule)

export function openTerminalSession(request: OpenTerminalSessionRequest): Promise<void> {
  return TerminalModule.openTerminalSession(request)
}

export function subscribeTerminalEvents(
  listener: (event: TerminalSessionEvent) => void,
): EmitterSubscription {
  return emitter.addListener('terminalEvent', listener)
}
