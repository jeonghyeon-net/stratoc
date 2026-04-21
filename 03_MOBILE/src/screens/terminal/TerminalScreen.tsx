import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LayoutChangeEvent, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { OpenTerminalSessionRequest, TerminalSessionEvent } from '@/bridge/terminal/types'
import {
  closeTerminalSession,
  hasNativeTerminalModule,
  openTerminalSession,
  resizeTerminalSession,
  sendTerminalInput,
  subscribeTerminalEvents,
  subscribeTerminalOutput,
} from '@/bridge/terminal'
import { createTerminalSocket, TerminalSocket } from './terminalSocket'
import { TerminalWebViewHandle, XtermWebView } from './XtermWebView'
import { NativeTerminalInlineView, hasNativeTerminalInlineView } from '@/bridge/terminal/NativeTerminalInlineView'

const CONNECT_TIMEOUT_MS = 8000
const SPECIAL_KEYS = [
  { label: 'Esc', sequence: '\u001b' },
  { label: 'Tab', sequence: '\t' },
  { label: '↑', sequence: '\u001b[A' },
  { label: '↓', sequence: '\u001b[B' },
  { label: '←', sequence: '\u001b[D' },
  { label: '→', sequence: '\u001b[C' },
]

type TerminalViewport = {
  columns: number
  rows: number
}

export function TerminalScreen({
  request,
  onBack,
  onSessionReplaced,
  inline = false,
}: {
  request: OpenTerminalSessionRequest
  onBack: () => void
  onSessionReplaced?: (message: string) => void
  inline?: boolean
}) {
  const terminalRef = useRef<TerminalWebViewHandle | null>(null)
  const inlineTerminalRef = useRef<{ sendSequence: (sequence: string) => void; setSoftCtrlArmed: (armed: boolean) => void; setSoftAltArmed: (armed: boolean) => void; setSoftShiftArmed: (armed: boolean) => void } | null>(null)
  const keyboardRef = useRef<TextInput | null>(null)
  const socketRef = useRef<TerminalSocket | null>(null)
  const pendingOutputRef = useRef<string[]>([])
  const exitHandledRef = useRef(false)
  const connectStartedRef = useRef(false)
  const connectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const usingNativeActivity = hasNativeTerminalModule() && !inline
  const usingNativeInline = Platform.OS === 'android' && inline && hasNativeTerminalInlineView()
  const [status, setStatus] = useState('connecting')
  const [terminalReady, setTerminalReady] = useState(false)
  const [viewport, setViewport] = useState<TerminalViewport | null>(null)
  const [keyboardBuffer, setKeyboardBuffer] = useState('')
  const [softCtrlArmed, setSoftCtrlArmed] = useState(false)
  const [softAltArmed, setSoftAltArmed] = useState(false)
  const [softShiftArmed, setSoftShiftArmed] = useState(false)

  const sizedRequest = useMemo(() => {
    if (!viewport) {
      return request
    }
    return {
      ...request,
      columns: viewport.columns,
      rows: viewport.rows,
    }
  }, [request, viewport])

  const clearConnectTimeout = useCallback(() => {
    if (connectTimeoutRef.current === null) {
      return
    }
    clearTimeout(connectTimeoutRef.current)
    connectTimeoutRef.current = null
  }, [])

  const writeOutput = useCallback((data: string) => {
    if (!data) {
      return
    }
    if (!terminalReady || !terminalRef.current) {
      pendingOutputRef.current.push(data)
      return
    }
    terminalRef.current.write(encodeTerminalText(data))
  }, [terminalReady])

  const syncSoftCtrl = useCallback((armed: boolean) => {
    setSoftCtrlArmed(armed)
    if (usingNativeInline) {
      inlineTerminalRef.current?.setSoftCtrlArmed(armed)
    }
  }, [usingNativeInline])

  const syncSoftAlt = useCallback((armed: boolean) => {
    setSoftAltArmed(armed)
    if (usingNativeInline) {
      inlineTerminalRef.current?.setSoftAltArmed(armed)
    }
  }, [usingNativeInline])

  const syncSoftShift = useCallback((armed: boolean) => {
    setSoftShiftArmed(armed)
    if (usingNativeInline) {
      inlineTerminalRef.current?.setSoftShiftArmed(armed)
    }
  }, [usingNativeInline])

  const disarmSoftCtrl = useCallback(() => {
    syncSoftCtrl(false)
  }, [syncSoftCtrl])

  const disarmSoftAlt = useCallback(() => {
    syncSoftAlt(false)
  }, [syncSoftAlt])

  const disarmSoftShift = useCallback(() => {
    syncSoftShift(false)
  }, [syncSoftShift])

  const armSoftCtrl = useCallback(() => {
    syncSoftCtrl(true)
    if (!usingNativeInline) {
      keyboardRef.current?.focus()
      terminalRef.current?.focus()
    }
  }, [syncSoftCtrl, usingNativeInline])

  const armSoftAlt = useCallback(() => {
    syncSoftAlt(true)
    if (!usingNativeInline) {
      keyboardRef.current?.focus()
      terminalRef.current?.focus()
    }
  }, [syncSoftAlt, usingNativeInline])

  const armSoftShift = useCallback(() => {
    syncSoftShift(true)
    if (!usingNativeInline) {
      keyboardRef.current?.focus()
      terminalRef.current?.focus()
    }
  }, [syncSoftShift, usingNativeInline])

  const sendInput = useCallback((value: string) => {
    if (!value) {
      return
    }
    const nextValue = applySoftModifiersToText(value, softCtrlArmed, softAltArmed, softShiftArmed)
    if (usingNativeActivity) {
      void sendTerminalInput(nextValue).catch((error) => {
        setStatus(asMessage(error, 'send failed'))
      })
      if (softCtrlArmed) {
        disarmSoftCtrl()
      }
      if (softAltArmed) {
        disarmSoftAlt()
      }
      if (softShiftArmed) {
        disarmSoftShift()
      }
      return
    }
    if (usingNativeInline) {
      return
    }
    socketRef.current?.sendInput(nextValue)
    if (softCtrlArmed) {
      disarmSoftCtrl()
    }
    if (softAltArmed) {
      disarmSoftAlt()
    }
    if (softShiftArmed) {
      disarmSoftShift()
    }
  }, [disarmSoftAlt, disarmSoftCtrl, disarmSoftShift, softAltArmed, softCtrlArmed, softShiftArmed, usingNativeActivity, usingNativeInline])

  const focusTerminal = useCallback(() => {
    keyboardRef.current?.focus()
    terminalRef.current?.focus()
  }, [])

  const sendSpecialSequence = useCallback((sequence: string) => {
    if (!sequence) {
      return
    }
    if (usingNativeInline) {
      inlineTerminalRef.current?.sendSequence(sequence)
      disarmSoftCtrl()
      disarmSoftAlt()
      disarmSoftShift()
      return
    }
    focusTerminal()
    sendInput(sequence)
  }, [disarmSoftAlt, disarmSoftCtrl, disarmSoftShift, focusTerminal, sendInput, usingNativeInline])

  useEffect(() => {
    connectStartedRef.current = false
    clearConnectTimeout()
    socketRef.current?.close('session switching')
    socketRef.current = null
    setStatus('connecting')
    pendingOutputRef.current = []
    exitHandledRef.current = false
    terminalRef.current?.clear()
  }, [clearConnectTimeout, request.authToken, request.hostUrl, request.sessionName])

  useEffect(() => {
    if (!usingNativeActivity && !usingNativeInline) {
      return
    }
    const outputSubscription = usingNativeActivity
      ? subscribeTerminalOutput(({ data }) => {
          writeOutput(data)
        })
      : { remove() {} }
    const eventSubscription = subscribeTerminalEvents((event) => {
      if (event.sessionName && event.sessionName !== request.sessionName) {
        return
      }
      if (event.type === 'soft-ctrl-state') {
        syncSoftCtrl(event.armed)
        return
      }
      if (event.type === 'soft-alt-state') {
        syncSoftAlt(event.armed)
        return
      }
      if (event.type === 'soft-shift-state') {
        syncSoftShift(event.armed)
        return
      }
      handleTerminalEvent(event, setStatus, clearConnectTimeout)
      if ((event.type === 'disconnected' || event.type === 'closed') && isReplacedConnection(event.message) && !exitHandledRef.current) {
        exitHandledRef.current = true
        onSessionReplaced?.(event.message ?? 'replaced by newer connection')
      }
    })
    return () => {
      outputSubscription.remove()
      eventSubscription.remove()
    }
  }, [clearConnectTimeout, onSessionReplaced, request.sessionName, syncSoftAlt, syncSoftCtrl, syncSoftShift, usingNativeActivity, usingNativeInline, writeOutput])

  useEffect(() => {
    if (!viewport || connectStartedRef.current) {
      return
    }
    connectStartedRef.current = true
    clearConnectTimeout()
    connectTimeoutRef.current = setTimeout(() => {
      setStatus('connect timeout')
    }, CONNECT_TIMEOUT_MS)

    if (usingNativeActivity) {
      void openTerminalSession(sizedRequest)
        .then(() => {
          clearConnectTimeout()
          setStatus('connected')
          focusTerminal()
        })
        .catch((error) => {
          clearConnectTimeout()
          setStatus(asMessage(error, 'connect failed'))
        })
      return
    }

    if (usingNativeInline) {
      clearConnectTimeout()
      setStatus('connecting')
      return
    }

    const socket = createTerminalSocket(sizedRequest)
    socketRef.current = socket
    socket.onOpen(() => {
      clearConnectTimeout()
      setStatus('connected')
      focusTerminal()
    })
    socket.onOutput((chunk) => {
      writeOutput(chunk)
    })
    socket.onDisconnect((reason) => {
      clearConnectTimeout()
      if (isReplacedConnection(reason) && !exitHandledRef.current) {
        exitHandledRef.current = true
        onSessionReplaced?.(reason ?? 'replaced by newer connection')
        return
      }
      setStatus(reason || 'disconnected')
    })
    try {
      socket.connect()
    } catch (error) {
      clearConnectTimeout()
      setStatus(asMessage(error, 'connect failed'))
    }
  }, [clearConnectTimeout, focusTerminal, onSessionReplaced, sizedRequest, usingNativeActivity, usingNativeInline, viewport, writeOutput])

  useEffect(() => {
    if (!terminalReady) {
      return
    }
    if (pendingOutputRef.current.length === 0 || !terminalRef.current) {
      return
    }
    const pending = pendingOutputRef.current.join('')
    pendingOutputRef.current = []
    terminalRef.current.write(encodeTerminalText(pending))
  }, [terminalReady])

  useEffect(() => {
    if (!viewport || !connectStartedRef.current || status !== 'connected') {
      return
    }
    if (usingNativeActivity) {
      void resizeTerminalSession(viewport.columns, viewport.rows).catch(() => {})
      return
    }
    if (usingNativeInline) {
      return
    }
    socketRef.current?.sendResize(viewport.columns, viewport.rows)
  }, [status, usingNativeActivity, usingNativeInline, viewport])

  useEffect(() => {
    return () => {
      clearConnectTimeout()
      socketRef.current?.close('screen closing')
      socketRef.current = null
      if (usingNativeActivity) {
        void closeTerminalSession('screen closing')
      }
    }
  }, [clearConnectTimeout, usingNativeActivity])

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout
    const columns = Math.max(20, Math.floor(width / 9))
    const rows = Math.max(10, Math.floor(height / 18))
    setViewport((current) => {
      if (current?.columns === columns && current?.rows === rows) {
        return current
      }
      return { columns, rows }
    })
  }, [])

  return (
    <View style={styles.container}>
      {!usingNativeInline ? (
        <TextInput
          ref={keyboardRef}
          value={keyboardBuffer}
          onChangeText={(value) => {
            if (!value) {
              setKeyboardBuffer('')
              return
            }
            sendInput(value)
            setKeyboardBuffer('')
          }}
          onKeyPress={({ nativeEvent }) => {
            if (nativeEvent.key === 'Backspace') {
              sendInput('\u007f')
              setKeyboardBuffer('')
            }
          }}
          onSubmitEditing={() => {
            sendInput('\r')
            setKeyboardBuffer('')
          }}
          autoCapitalize='none'
          autoCorrect={false}
          blurOnSubmit={false}
          submitBehavior='submit'
          returnKeyType='done'
          contextMenuHidden
          caretHidden
          showSoftInputOnFocus
          underlineColorAndroid='transparent'
          style={styles.hiddenKeyboardInput}
          testID='terminal-hidden-input'
        />
      ) : null}
      {usingNativeInline ? (
        <View testID='terminal-shell' style={styles.terminalShell}>
          <View testID='terminal-viewport' style={styles.terminalViewport} onLayout={handleLayout}>
            <NativeTerminalInlineView
              ref={inlineTerminalRef}
              key={`${request.hostUrl}::${request.sessionName}`}
              style={styles.terminalView}
              hostUrl={request.hostUrl}
              authToken={request.authToken}
              sessionName={request.sessionName}
              fontScale={request.fontScale}
            />
          </View>
        </View>
      ) : (
        <>
          <Pressable testID='terminal-shell' style={styles.terminalShell} onPress={focusTerminal}>
            <View testID='terminal-viewport' style={styles.terminalViewport} onLayout={handleLayout}>
              <XtermWebView
                ref={terminalRef}
                style={styles.terminalView}
                size={viewport ? { cols: viewport.columns, rows: viewport.rows } : undefined}
                options={{
                  fontSize: Math.round(14 * request.fontScale),
                  theme: {
                    background: '#000000',
                    black: '#000000',
                  },
                }}
                onInitialized={() => {
                  setTerminalReady(true)
                  focusTerminal()
                }}
                onData={sendInput}
              />
            </View>
          </Pressable>
        </>
      )}
      <View style={styles.accessoryBar}>
        <ScrollView
          horizontal
          style={styles.keyBarScroll}
          contentContainerStyle={styles.keyBar}
          keyboardShouldPersistTaps='always'
          showsHorizontalScrollIndicator={false}
        >
          <Pressable
            onPress={() => {
              if (softCtrlArmed) {
                disarmSoftCtrl()
                return
              }
              armSoftCtrl()
            }}
            style={[styles.keyButton, softCtrlArmed && styles.keyButtonActive]}
            testID='terminal-key-Ctrl'
          >
            <Text style={[styles.keyButtonText, softCtrlArmed && styles.keyButtonTextActive]}>Ctrl</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              if (softAltArmed) {
                disarmSoftAlt()
                return
              }
              armSoftAlt()
            }}
            style={[styles.keyButton, softAltArmed && styles.keyButtonActive]}
            testID='terminal-key-Alt'
          >
            <Text style={[styles.keyButtonText, softAltArmed && styles.keyButtonTextActive]}>Alt</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              if (softShiftArmed) {
                disarmSoftShift()
                return
              }
              armSoftShift()
            }}
            style={[styles.keyButton, softShiftArmed && styles.keyButtonActive]}
            testID='terminal-key-Shift'
          >
            <Text style={[styles.keyButtonText, softShiftArmed && styles.keyButtonTextActive]}>Shift</Text>
          </Pressable>
          {SPECIAL_KEYS.map((item) => (
            <Pressable
              key={item.label}
              onPress={() => sendSpecialSequence(item.sequence)}
              style={styles.keyButton}
              testID={`terminal-key-${item.label}`}
            >
              <Text style={styles.keyButtonText}>{item.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </View>
  )
}

function handleTerminalEvent(
  event: TerminalSessionEvent,
  setStatus: React.Dispatch<React.SetStateAction<string>>,
  clearConnectTimeout: () => void,
) {
  if (event.type === 'opened') {
    clearConnectTimeout()
    setStatus('connected')
    return
  }
  if (event.type === 'disconnected') {
    clearConnectTimeout()
    setStatus(event.message || 'disconnected')
    return
  }
  if (event.type === 'closed') {
    clearConnectTimeout()
    setStatus(event.reason)
    return
  }
  if (event.type === 'auth-error') {
    clearConnectTimeout()
    setStatus('auth error')
    return
  }
  if (event.type === 'session-not-found') {
    clearConnectTimeout()
    setStatus('session not found')
    return
  }
  if (event.type === 'certificate-changed') {
    clearConnectTimeout()
    setStatus('certificate changed')
  }
}

function encodeTerminalText(value: string) {
  const encoded = unescape(encodeURIComponent(value))
  const bytes = new Uint8Array(encoded.length)
  for (let index = 0; index < encoded.length; index += 1) {
    bytes[index] = encoded.charCodeAt(index)
  }
  return bytes
}

function applySoftModifiersToText(value: string, ctrlArmed: boolean, altArmed: boolean, shiftArmed: boolean) {
  if (!value) {
    return value
  }
  const [first = '', ...rest] = Array.from(value)
  const shifted = shiftArmed ? shiftify(first) : first
  const firstValue = ctrlArmed ? ctrlify(shifted) : shifted
  const prefix = altArmed ? '\u001b' : ''
  return `${prefix}${firstValue}${rest.join('')}`
}

function shiftify(char: string) {
  if (char.length === 0) {
    return char
  }
  switch (char) {
    case '`': return '~'
    case '1': return '!'
    case '2': return '@'
    case '3': return '#'
    case '4': return '$'
    case '5': return '%'
    case '6': return '^'
    case '7': return '&'
    case '8': return '*'
    case '9': return '('
    case '0': return ')'
    case '-': return '_'
    case '=': return '+'
    case '[': return '{'
    case ']': return '}'
    case '\\': return '|'
    case ';': return ':'
    case "'": return '"'
    case ',': return '<'
    case '.': return '>'
    case '/': return '?'
    default: {
      const upper = char.toUpperCase()
      return upper.length === char.length ? upper : char
    }
  }
}

function ctrlify(char: string) {
  if (char.length === 0) {
    return char
  }
  const code = char.codePointAt(0) ?? 0
  if (code >= 97 && code <= 122) {
    return String.fromCodePoint(code - 96)
  }
  if (code >= 65 && code <= 90) {
    return String.fromCodePoint(code - 64)
  }
  switch (char) {
    case '2':
    case ' ':
      return '\u0000'
    case '3':
    case '[':
      return '\u001b'
    case '4':
    case '\\':
      return '\u001c'
    case '5':
    case ']':
      return '\u001d'
    case '6':
    case '^':
      return '\u001e'
    case '7':
    case '_':
    case '/':
      return '\u001f'
    case '8':
      return '\u007f'
    default:
      return char
  }
}

function isReplacedConnection(message?: string) {
  return message?.toLowerCase().includes('replaced') ?? false
}

function asMessage(caught: unknown, fallback: string) {
  if (caught instanceof Error && caught.message.trim()) {
    return caught.message
  }
  return fallback
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  terminalShell: {
    flex: 1,
    paddingHorizontal: 6,
    paddingTop: 6,
    paddingBottom: 0,
    backgroundColor: '#000000',
  },
  terminalViewport: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#000000',
  },
  terminalView: {
    flex: 1,
    backgroundColor: '#000000',
  },
  hiddenKeyboardInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  accessoryBar: {
    minHeight: 52,
    borderTopWidth: 1,
    borderTopColor: '#44475a',
    backgroundColor: '#000000',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  keyBarScroll: {
    flexGrow: 0,
  },
  keyBar: {
    alignItems: 'center',
    gap: 8,
    paddingRight: 8,
  },
  keyButton: {
    minWidth: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#3f3f46',
    backgroundColor: '#000000',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  keyButtonActive: {
    borderColor: '#bd93f9',
    backgroundColor: '#1a1326',
  },
  keyButtonText: {
    color: '#f8f8f2',
    fontWeight: '600',
  },
  keyButtonTextActive: {
    color: '#bd93f9',
  },
})
