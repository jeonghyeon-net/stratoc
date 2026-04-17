import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import {
  AppScreen,
  AppState,
  connectToSession,
  createInitialAppState,
  createSessionForHost,
  deleteSessionForHost,
  loadAppState,
  openHost,
  refreshHosts,
  removeManualHost,
  saveManualHost,
  saveSettings,
} from './controller'
import { HostListScreen } from '@/screens/hosts/HostListScreen'
import { SessionListScreen } from '@/screens/sessions/SessionListScreen'
import { SettingsScreen } from '@/screens/settings/SettingsScreen'

export function AppNavigation() {
  const [state, setState] = useState<AppState>(createInitialAppState)
  const [manualHostUrl, setManualHostUrl] = useState('')
  const [manualHostToken, setManualHostToken] = useState('')

  useEffect(() => {
    void loadAppState().then(setState)
  }, [])

  const reloadHosts = useCallback(async () => {
    const hosts = await refreshHosts(state.defaultServerUrl, state.defaultAuthToken)
    setState((current) => ({ ...current, hosts }))
  }, [state.defaultAuthToken, state.defaultServerUrl])

  const openSelectedHost = useCallback(async (host: AppState['hosts'][number]) => {
    const result = await openHost(host, state.defaultAuthToken)
    setState((current) => ({
      ...current,
      screen: 'sessions',
      selectedHost: host,
      sessions: result.sessions,
      sessionError: result.sessionError,
    }))
  }, [state.defaultAuthToken])

  const createSelectedSession = useCallback(async () => {
    if (!state.selectedHost) {
      return
    }
    const result = await createSessionForHost(state.selectedHost, state.sessions, state.defaultAuthToken)
    setState((current) => ({ ...current, sessions: result.sessions }))
  }, [state.defaultAuthToken, state.selectedHost, state.sessions])

  const deleteSelectedSession = useCallback(async (name: string) => {
    if (!state.selectedHost) {
      return
    }
    const sessions = await deleteSessionForHost(state.selectedHost, name, state.defaultAuthToken)
    setState((current) => ({ ...current, sessions }))
  }, [state.defaultAuthToken, state.selectedHost])

  const persistSettings = useCallback(async () => {
    await saveSettings(state.defaultServerUrl, state.defaultAuthToken)
    await reloadHosts()
    setState((current) => ({ ...current, screen: 'hosts' }))
  }, [reloadHosts, state.defaultAuthToken, state.defaultServerUrl])

  const saveHost = useCallback(async () => {
    await saveManualHost(manualHostUrl, manualHostToken)
    setManualHostUrl('')
    setManualHostToken('')
    await reloadHosts()
  }, [manualHostToken, manualHostUrl, reloadHosts])

  const currentContent = useMemo(() => {
    if (state.screen === 'sessions' && state.selectedHost) {
      return (
        <SessionListScreen
          items={state.sessions}
          errorText={state.sessionError}
          onBack={() => setState((current) => ({ ...current, screen: 'hosts', sessionError: '' }))}
          onCreate={createSelectedSession}
          onDelete={(item) => void deleteSelectedSession(item.name)}
          onOpen={(item) => void connectToSession(state.selectedHost!, item.name, state.defaultAuthToken)}
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
          onRefresh={() => void reloadHosts()}
          onOpen={(host) => void openSelectedHost(host)}
          onOpenSettings={() => setState((current) => ({ ...current, screen: 'settings' }))}
          onRemove={(host) => void removeManualHost(host.url).then(reloadHosts)}
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
      <ScrollView contentContainerStyle={styles.scrollContent}>{currentContent}</ScrollView>
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
  scrollContent: {
    flexGrow: 1,
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
