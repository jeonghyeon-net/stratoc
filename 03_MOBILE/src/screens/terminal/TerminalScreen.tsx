import React, { useEffect, useRef, useState } from 'react'
import {
  LayoutChangeEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
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

export function TerminalScreen({
  request,
  onBack,
}: {
  request: OpenTerminalSessionRequest
  onBack: () => void
}) {
  const socketRef = useRef<TerminalSocket | null>(null)
  const usingNative = hasNativeTerminalModule()
  const [output, setOutput] = useState('')
  const [status, setStatus] = useState('connecting')
  const [input, setInput] = useState('')

  useEffect(() => {
    if (usingNative) {
      const outputSubscription = subscribeTerminalOutput(({ data }) => {
        setOutput((current) => current + data)
      })
      const eventSubscription = subscribeTerminalEvents((event) => {
        handleTerminalEvent(event, setStatus)
      })
      void openTerminalSession(request)

      return () => {
        outputSubscription.remove()
        eventSubscription.remove()
        void closeTerminalSession('screen closing')
      }
    }

    const socket = createTerminalSocket(request)
    socketRef.current = socket
    socket.onOutput((chunk) => {
      setOutput((current) => current + chunk)
    })
    socket.onDisconnect((reason) => {
      setStatus(reason || 'disconnected')
    })
    socket.onOpen(() => {
      setStatus('connected')
    })
    socket.connect()

    return () => {
      socket.close('screen closing')
    }
  }, [request, usingNative])

  function handleSubmit() {
    if (!input) {
      return
    }
    if (usingNative) {
      void sendTerminalInput(`${input}\n`)
    } else {
      socketRef.current?.sendInput(`${input}\n`)
    }
    setInput('')
  }

  function handleLayout(event: LayoutChangeEvent) {
    const { width, height } = event.nativeEvent.layout
    const columns = Math.max(20, Math.floor(width / 9))
    const rows = Math.max(10, Math.floor(height / 18))
    if (usingNative) {
      void resizeTerminalSession(columns, rows)
      return
    }
    socketRef.current?.sendResize(columns, rows)
  }

  return (
    <View style={styles.container} onLayout={handleLayout}>
      <View style={styles.actionsRow}>
        <Pressable onPress={onBack} style={styles.smallAction}>
          <Text>뒤로</Text>
        </Pressable>
        <Text style={styles.status}>{status}</Text>
      </View>
      <ScrollView style={styles.outputArea} contentContainerStyle={styles.outputContent}>
        <Text style={styles.outputText}>{output || '(empty)'}</Text>
      </ScrollView>
      <View style={styles.inputRow}>
        <TextInput
          value={input}
          onChangeText={setInput}
          onSubmitEditing={handleSubmit}
          style={styles.input}
          placeholder='command'
          autoCapitalize='none'
          autoCorrect={false}
        />
        <Pressable onPress={handleSubmit} style={styles.sendButton}>
          <Text style={styles.sendButtonText}>전송</Text>
        </Pressable>
      </View>
    </View>
  )
}

function handleTerminalEvent(
  event: TerminalSessionEvent,
  setStatus: React.Dispatch<React.SetStateAction<string>>,
) {
  if (event.type === 'opened') {
    setStatus('connected')
    return
  }
  if (event.type === 'disconnected') {
    setStatus(event.message || 'disconnected')
    return
  }
  if (event.type === 'closed') {
    setStatus(event.reason)
    return
  }
  if (event.type === 'auth-error') {
    setStatus('auth error')
    return
  }
  if (event.type === 'session-not-found') {
    setStatus('session not found')
    return
  }
  if (event.type === 'certificate-changed') {
    setStatus('certificate changed')
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  smallAction: {
    borderRadius: 8,
    backgroundColor: '#f4f4f5',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  status: {
    color: '#52525b',
  },
  outputArea: {
    flex: 1,
    borderRadius: 8,
    backgroundColor: '#020617',
  },
  outputContent: {
    padding: 12,
  },
  outputText: {
    color: '#e2e8f0',
    fontFamily: 'Menlo',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d4d4d8',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  sendButton: {
    borderRadius: 8,
    backgroundColor: '#0f172a',
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
})
