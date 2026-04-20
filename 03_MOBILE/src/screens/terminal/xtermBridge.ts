import { Base64 } from 'js-base64'

export type TerminalWebInboundMessage =
  | { type: 'initialized' }
  | { type: 'input'; str: string }
  | { type: 'debug'; message: string }

export type TerminalWebOutboundMessage =
  | { type: 'write'; bStr: string }
  | { type: 'resize'; cols: number; rows: number }
  | { type: 'fit' }
  | { type: 'clear' }
  | { type: 'focus' }
  | { type: 'setOptions'; opts: Record<string, unknown> }

export function encodeBytes(bytes: Uint8Array) {
  return Base64.fromUint8Array(bytes)
}

export function decodeBytes(value: string) {
  return Base64.toUint8Array(value)
}
