import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LayoutChangeEvent, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
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

const CONNECT_TIMEOUT_MS = 8000
const SPECIAL_KEYS = [
  { label: 'Esc', sequence: '\u001b' },
  { label: 'Tab', sequence: '\t' },
  { label: 'Ctrl-C', sequence: '\u0003' },
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
}: {
  request: OpenTerminalSessionRequest
  onBack: () => void
  onSessionReplaced?: (message: string) => void
}) {
  const terminalRef = useRef<TerminalWebViewHandle | null>(null)
  const keyboardRef = useRef<TextInput | null>(null)
  const socketRef = useRef<TerminalSocket | null>(null)
  const pendingOutputRef = useRef<string[]>([])
  const exitHandledRef = useRef(false)
  const connectStartedRef = useRef(false)
  const connectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const usingNative = hasNativeTerminalModule()
  const [status, setStatus] = useState('connecting')
  const [terminalReady, setTerminalReady] = useState(false)
  const [viewport, setViewport] = useState<TerminalViewport | null>(null)
  const [keyboardBuffer, setKeyboardBuffer] = useState('')

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

  const sendInput = useCallback((value: string) => {
    if (!value) {
      return
    }
    if (usingNative) {
      void sendTerminalInput(value).catch((error) => {
        setStatus(asMessage(error, 'send failed'))
      })
      return
    }
    socketRef.current?.sendInput(value)
  }, [usingNative])

  const focusTerminal = useCallback(() => {
    keyboardRef.current?.focus()
    terminalRef.current?.focus()
  }, [])

  useEffect(() => {
    connectStartedRef.current = false
    clearConnectTimeout()
    setStatus('connecting')
    pendingOutputRef.current = []
    exitHandledRef.current = false
    terminalRef.current?.clear()
  }, [clearConnectTimeout, request.authToken, request.hostUrl, request.sessionName])

  useEffect(() => {
    if (!usingNative) {
      return
    }
    const outputSubscription = subscribeTerminalOutput(({ data }) => {
      writeOutput(data)
    })
    const eventSubscription = subscribeTerminalEvents((event) => {
      handleTerminalEvent(event, setStatus, clearConnectTimeout)
      if (event.type === 'disconnected' && isReplacedConnection(event.message) && !exitHandledRef.current) {
        exitHandledRef.current = true
        onSessionReplaced?.(event.message ?? 'replaced by newer connection')
      }
    })
    return () => {
      outputSubscription.remove()
      eventSubscription.remove()
    }
  }, [clearConnectTimeout, onSessionReplaced, usingNative, writeOutput])

  useEffect(() => {
    if (!viewport || connectStartedRef.current) {
      return
    }
    connectStartedRef.current = true
    clearConnectTimeout()
    connectTimeoutRef.current = setTimeout(() => {
      setStatus('connect timeout')
    }, CONNECT_TIMEOUT_MS)

    if (usingNative) {
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
  }, [clearConnectTimeout, focusTerminal, onSessionReplaced, sizedRequest, usingNative, viewport, writeOutput])

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
    if (usingNative) {
      void resizeTerminalSession(viewport.columns, viewport.rows).catch(() => {})
      return
    }
    socketRef.current?.sendResize(viewport.columns, viewport.rows)
  }, [status, usingNative, viewport])

  useEffect(() => {
    return () => {
      clearConnectTimeout()
      socketRef.current?.close('screen closing')
      socketRef.current = null
      if (usingNative) {
        void closeTerminalSession('screen closing')
      }
    }
  }, [clearConnectTimeout, usingNative])

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
      />
      <View style={styles.actionsRow}>
        <Pressable onPress={onBack} style={styles.smallAction}>
          <Text style={styles.smallActionText}>뒤로</Text>
        </Pressable>
        <Text testID='terminal-status' style={styles.status}>{status}</Text>
      </View>
      <Pressable testID='terminal-shell' style={styles.terminalShell} onPress={focusTerminal}>
        <View testID='terminal-viewport' style={styles.terminalViewport} onLayout={handleLayout}>
          <XtermWebView
            ref={terminalRef}
            style={styles.terminalView}
            size={viewport ? { cols: viewport.columns, rows: viewport.rows } : undefined}
            onInitialized={() => {
              setTerminalReady(true)
              focusTerminal()
            }}
            onData={sendInput}
          />
        </View>
      </Pressable>
      <View style={styles.accessoryBar}>
        <ScrollView
          horizontal
          style={styles.keyBarScroll}
          contentContainerStyle={styles.keyBar}
          keyboardShouldPersistTaps='always'
          showsHorizontalScrollIndicator={false}
        >
          {SPECIAL_KEYS.map((item) => (
            <Pressable
              key={item.label}
              onPress={() => {
                focusTerminal()
                sendInput(item.sequence)
              }}
              style={styles.keyButton}
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
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 12,
    backgroundColor: '#020617',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  smallAction: {
    borderRadius: 8,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  smallActionText: {
    color: '#f8fafc',
    fontWeight: '600',
  },
  status: {
    color: '#94a3b8',
    flexShrink: 1,
    textAlign: 'right',
  },
  terminalShell: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1e293b',
    backgroundColor: '#020617',
  },
  terminalViewport: {
    flex: 1,
    backgroundColor: '#020617',
  },
  terminalView: {
    flex: 1,
    backgroundColor: '#020617',
  },
  hiddenKeyboardInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  accessoryBar: {
    minHeight: 64,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    backgroundColor: '#020617',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
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
    minWidth: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#0f172a',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  keyButtonText: {
    color: '#f8fafc',
    fontWeight: '600',
  },
})
