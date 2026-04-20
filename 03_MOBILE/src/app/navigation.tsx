import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import {
  AppScreen,
  AppState,
  createInitialAppState,
  createSessionForHost,
  deleteSessionForHost,
  loadAppState,
  openHost,
  refreshHosts,
  removeManualHost,
  saveManualHost,
  saveSettings,
  terminalRequestForSession,
} from './controller'
import { HostListScreen } from '@/screens/hosts/HostListScreen'
import { SessionListScreen } from '@/screens/sessions/SessionListScreen'
import { SettingsScreen } from '@/screens/settings/SettingsScreen'
import { TerminalScreen } from '@/screens/terminal/TerminalScreen'
import { hasNativeTerminalModule, openTerminalSession } from '@/bridge/terminal'

export function AppNavigation() {
  const [state, setState] = useState<AppState>(createInitialAppState)
  const [manualHostUrl, setManualHostUrl] = useState('')
  const [manualHostToken, setManualHostToken] = useState('')

  useEffect(() => {
    void loadAppState().then(setState)
  }, [])

  const reloadHosts = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, hostError: '' }))
    try {
      const hosts = await refreshHosts(state.defaultServerUrl, state.defaultAuthToken)
      setState((current) => ({ ...current, hosts, loading: false, hostError: '' }))
    } catch (caught) {
      const message = asMessage(caught, '(host refresh failed)')
      setState((current) => ({
        ...current,
        loading: false,
        hostError: message,
      }))
    }
  }, [state.defaultAuthToken, state.defaultServerUrl])

  const openSelectedHost = useCallback(async (host: AppState['hosts'][number]) => {
    setState((current) => ({ ...current, loading: true, hostError: '' }))
    try {
      const result = await openHost(host, state.defaultAuthToken)
      setState((current) => ({
        ...current,
        loading: false,
        screen: 'sessions',
        selectedHost: host,
        sessions: result.sessions,
        sessionError: result.sessionError,
        terminalRequest: null,
      }))
    } catch (caught) {
      const message = asMessage(caught, '(open host failed)')
      setState((current) => ({
        ...current,
        loading: false,
        hostError: message,
      }))
    }
  }, [state.defaultAuthToken])

  const createSelectedSession = useCallback(async () => {
    if (!state.selectedHost) {
      return
    }
    setState((current) => ({ ...current, loading: true, sessionError: '' }))
    try {
      const result = await createSessionForHost(state.selectedHost, state.sessions, state.defaultAuthToken)
      setState((current) => ({
        ...current,
        loading: false,
        sessions: result.sessions,
        sessionError: result.sessionError || (result.created ? '' : '(create session failed)'),
      }))
    } catch (caught) {
      const message = asMessage(caught, '(create session failed)')
      setState((current) => ({
        ...current,
        loading: false,
        sessionError: message,
      }))
    }
  }, [state.defaultAuthToken, state.selectedHost, state.sessions])

  const deleteSelectedSession = useCallback(async (name: string) => {
    if (!state.selectedHost) {
      return
    }
    setState((current) => ({ ...current, loading: true, sessionError: '' }))
    try {
      const result = await deleteSessionForHost(state.selectedHost, name, state.defaultAuthToken)
      setState((current) => ({ ...current, loading: false, sessions: result.sessions, sessionError: result.sessionError }))
    } catch (caught) {
      const message = asMessage(caught, '(delete session failed)')
      setState((current) => ({
        ...current,
        loading: false,
        sessionError: message,
      }))
    }
  }, [state.defaultAuthToken, state.selectedHost])

  const persistSettings = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, hostError: '' }))
    try {
      await saveSettings(state.defaultServerUrl, state.defaultAuthToken)
      await reloadHosts()
      setState((current) => ({ ...current, loading: false, screen: 'hosts' }))
    } catch (caught) {
      const message = asMessage(caught, '(save settings failed)')
      setState((current) => ({
        ...current,
        loading: false,
        hostError: message,
      }))
    }
  }, [reloadHosts, state.defaultAuthToken, state.defaultServerUrl])

  const saveHost = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, hostError: '' }))
    try {
      await saveManualHost(manualHostUrl, manualHostToken)
      setManualHostUrl('')
      setManualHostToken('')
      await reloadHosts()
      setState((current) => ({ ...current, loading: false, hostError: '' }))
    } catch (caught) {
      const message = asMessage(caught, '(save host failed)')
      setState((current) => ({
        ...current,
        loading: false,
        hostError: message,
      }))
    }
  }, [manualHostToken, manualHostUrl, reloadHosts])

  const currentContent = useMemo(() => {
    if (state.screen === 'terminal' && state.terminalRequest) {
      return (
        <TerminalScreen
          request={state.terminalRequest}
          onBack={() => setState((current) => ({ ...current, screen: 'sessions', terminalRequest: null }))}
          onSessionReplaced={(message) =>
            setState((current) => ({
              ...current,
              screen: 'sessions',
              terminalRequest: null,
              sessionError: `(${message})`,
            }))
          }
        />
      )
    }
    if (state.screen === 'sessions' && state.selectedHost) {
      return (
        <SessionListScreen
          items={state.sessions}
          errorText={state.sessionError || (state.loading ? '(loading...)' : '')}
          onBack={() => setState((current) => ({ ...current, screen: 'hosts', sessionError: '' }))}
          onCreate={createSelectedSession}
          onDelete={(item) => void deleteSelectedSession(item.name)}
          onOpen={(item) =>
            void terminalRequestForSession(state.selectedHost!, item.name, state.defaultAuthToken).then(async (request) => {
              if (Platform.OS === 'android' && hasNativeTerminalModule()) {
                try {
                  await openTerminalSession(request)
                  setState((current) => ({ ...current, sessionError: '' }))
                } catch (caught) {
                  const message = asMessage(caught, '(open terminal failed)')
                  setState((current) => ({ ...current, sessionError: message }))
                }
                return
              }
              setState((current) => ({ ...current, screen: 'terminal', terminalRequest: request }))
            })
          }
        />
      )
    }
    if (state.screen === 'settings') {
      return (
        <SettingsScreen
          serverUrl={state.defaultServerUrl}
          authToken={state.defaultAuthToken}
          onBack={() => setState((current) => ({ ...current, screen: 'hosts' }))}
          onSave={() => void persistSettings()}
          onServerUrlChange={(value) => setState((current) => ({ ...current, defaultServerUrl: value }))}
          onAuthTokenChange={(value) => setState((current) => ({ ...current, defaultAuthToken: value }))}
        />
      )
    }
    return (
      <View style={styles.hostsContainer}>
        <HostListScreen
          items={state.hosts}
          errorText={state.hostError || (state.loading ? '(loading...)' : '')}
          onRefresh={() => void reloadHosts()}
          onOpen={(host) => void openSelectedHost(host)}
          onOpenSettings={() => setState((current) => ({ ...current, screen: 'settings' }))}
          onRemove={(host) =>
            void removeManualHost(host.url)
              .then(reloadHosts)
              .catch((caught) => {
                const message = asMessage(caught, '(remove host failed)')
                setState((current) => ({ ...current, hostError: message }))
              })
          }
        />
        <View style={styles.addHostForm}>
          <Text style={styles.formTitle}>수동 서버 추가</Text>
          <TextInput value={manualHostUrl} onChangeText={setManualHostUrl} style={styles.input} placeholder='https://10.0.0.2:62589' />
          <TextInput value={manualHostToken} onChangeText={setManualHostToken} style={styles.input} placeholder='인증 토큰' />
          <Pressable onPress={() => void saveHost()} style={styles.actionButton}>
            <Text style={styles.actionButtonText}>서버 저장</Text>
          </Pressable>
        </View>
      </View>
    )
  }, [createSelectedSession, deleteSelectedSession, manualHostToken, manualHostUrl, openSelectedHost, persistSettings, reloadHosts, saveHost, state])

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        {renderTab('hosts', state.screen, () => setState((current) => ({ ...current, screen: 'hosts' })))}
        {renderTab('settings', state.screen, () => setState((current) => ({ ...current, screen: 'settings' })))}
      </View>
      <View style={styles.contentArea}>{currentContent}</View>
    </View>
  )
}

function renderTab(tab: AppScreen, current: AppScreen, onPress: () => void) {
  return (
    <Pressable onPress={onPress} style={[styles.tab, current === tab && styles.tabActive]}>
      <Text style={styles.tabText}>{tab === 'hosts' ? 'Hosts' : 'Settings'}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  contentArea: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#f4f4f5',
  },
  tabActive: {
    backgroundColor: '#e0f2fe',
  },
  tabText: {
    fontWeight: '600',
  },
  hostsContainer: {
    flex: 1,
  },
  addHostForm: {
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  formTitle: {
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d4d4d8',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  actionButton: {
    borderRadius: 8,
    backgroundColor: '#0f172a',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
  },
})

function asMessage(caught: unknown, fallback: string) {
  if (caught instanceof Error && caught.message.trim()) {
    return caught.message
  }
  return fallback
}
