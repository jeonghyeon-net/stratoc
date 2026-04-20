import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native'
import {
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
import { subscribeTerminalEvents } from '@/bridge/terminal'
import { HostItem } from '@/models/host'
import { SessionItem } from '@/models/session'
import { appBreakpoints, appColors, appRadius, appSpacing, clampFontScale } from '@/theme/theme'

type WorkspaceSession = {
  id: string
  host: HostItem
  sessionName: string
  title: string
  occupiedMessage: string
  lastKnownState: 'idle' | 'live' | 'occupied'
}

export function AppNavigation() {
  const [state, setState] = useState<AppState>(createInitialAppState)
  const [manualHostUrl, setManualHostUrl] = useState('')
  const [manualHostToken, setManualHostToken] = useState('')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [sidebarVisible, setSidebarVisible] = useState(false)
  const [workspaceSessions, setWorkspaceSessions] = useState<WorkspaceSession[]>([])
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null)
  const { width } = useWindowDimensions()
  const tabletMode = width >= appBreakpoints.tablet
  const drawerWidth = Math.min(280, Math.max(248, Math.round(width * 0.86)))

  useEffect(() => {
    if (tabletMode) {
      setSidebarVisible(false)
    }
  }, [tabletMode])

  useEffect(() => {
    void loadAppState().then(setState)
  }, [])

  useEffect(() => {
    const subscription = subscribeTerminalEvents((event) => {
      const sessionName = event.sessionName
      if (!sessionName) {
        return
      }
      if (event.type === 'opened') {
        setWorkspaceSessions((current) => current.map((item) => (
          item.sessionName === sessionName
            ? { ...item, occupiedMessage: '', lastKnownState: 'live' }
            : item
        )))
        return
      }
      if ((event.type === 'disconnected' || event.type === 'closed') && isTakeoverMessage(event.message)) {
        setWorkspaceSessions((current) => current.map((item) => (
          item.sessionName === sessionName
            ? { ...item, occupiedMessage: takeoverMessage(event.message), lastKnownState: 'occupied' }
            : item
        )))
        setState((current) => ({
          ...current,
          screen: current.screen === 'terminal' ? 'sessions' : current.screen,
          terminalRequest: null,
          sessionError: takeoverMessage(event.message),
        }))
      }
    })
    return () => subscription.remove()
  }, [])

  const reloadHosts = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, hostError: '' }))
    try {
      const hosts = await refreshHosts(state.defaultServerUrl, state.defaultAuthToken)
      setState((current) => ({ ...current, hosts, loading: false, hostError: '' }))
    } catch (caught) {
      const message = asMessage(caught, '(host refresh failed)')
      setState((current) => ({ ...current, loading: false, hostError: message }))
    }
  }, [state.defaultAuthToken, state.defaultServerUrl])

  const openSelectedHost = useCallback(async (host: HostItem) => {
    setState((current) => ({ ...current, loading: true, hostError: '', screen: 'sessions', terminalRequest: null }))
    setSidebarVisible(false)
    try {
      const result = await openHost(host, state.defaultAuthToken)
      setState((current) => ({
        ...current,
        loading: false,
        screen: 'sessions',
        selectedHost: host,
        sessions: result.sessions,
        sessionError: result.sessionError,
      }))
    } catch (caught) {
      const message = asMessage(caught, '(open host failed)')
      setState((current) => ({ ...current, loading: false, hostError: message }))
    }
  }, [state.defaultAuthToken])

  const deleteSelectedSession = useCallback(async (name: string) => {
    if (!state.selectedHost) {
      return
    }
    setState((current) => ({ ...current, loading: true, sessionError: '' }))
    try {
      const result = await deleteSessionForHost(state.selectedHost, name, state.defaultAuthToken)
      setWorkspaceSessions((current) => current.filter((item) => !(item.host.id === state.selectedHost?.id && item.sessionName === name)))
      setActiveWorkspaceId((current) => {
        const activeItem = workspaceSessions.find((item) => item.id === current)
        if (activeItem?.sessionName === name && activeItem.host.id === state.selectedHost?.id) {
          return null
        }
        return current
      })
      setState((current) => ({ ...current, loading: false, sessions: result.sessions, sessionError: result.sessionError }))
    } catch (caught) {
      const message = asMessage(caught, '(delete session failed)')
      setState((current) => ({ ...current, loading: false, sessionError: message }))
    }
  }, [state.defaultAuthToken, state.selectedHost, workspaceSessions])

  const persistSettings = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, hostError: '' }))
    try {
      await saveSettings(state.defaultServerUrl, state.defaultAuthToken, state.defaultFontScale)
      await reloadHosts()
      setState((current) => ({ ...current, loading: false, screen: 'hosts' }))
    } catch (caught) {
      const message = asMessage(caught, '(save settings failed)')
      setState((current) => ({ ...current, loading: false, hostError: message }))
    }
  }, [reloadHosts, state.defaultAuthToken, state.defaultFontScale, state.defaultServerUrl])

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
      setState((current) => ({ ...current, loading: false, hostError: message }))
    }
  }, [manualHostToken, manualHostUrl, reloadHosts])

  const upsertWorkspace = useCallback((host: HostItem, session: SessionItem) => {
    const nextId = workspaceId(host, session.name)
    setActiveWorkspaceId(nextId)
    setWorkspaceSessions((current) => {
      const found = current.find((item) => item.id === nextId)
      if (found) {
        return current.map((item) => item.id === nextId ? {
          ...item,
          host,
          title: session.title || session.name,
          occupiedMessage: '',
          lastKnownState: 'idle',
        } : item)
      }
      return [{
        id: nextId,
        host,
        sessionName: session.name,
        title: session.title || session.name,
        occupiedMessage: '',
        lastKnownState: 'idle',
      }, ...current]
    })
  }, [])

  const openSessionWorkspace = useCallback(async (host: HostItem, item: SessionItem) => {
    upsertWorkspace(host, item)
    setSidebarVisible(false)
    try {
      const request = await terminalRequestForSession(host, item.name, state.defaultAuthToken, state.defaultFontScale)
      setState((current) => ({ ...current, screen: 'terminal', terminalRequest: request, sessionError: '' }))
    } catch (caught) {
      const message = asMessage(caught, '(open terminal failed)')
      setState((current) => ({ ...current, sessionError: message }))
    }
  }, [state.defaultAuthToken, state.defaultFontScale, upsertWorkspace])

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
      setState((current) => ({ ...current, loading: false, sessionError: message }))
    }
  }, [state.defaultAuthToken, state.selectedHost, state.sessions])

  const reclaimWorkspaceSession = useCallback(async (item: SessionItem) => {
    if (!state.selectedHost) {
      return
    }
    await openSessionWorkspace(state.selectedHost, item)
  }, [openSessionWorkspace, state.selectedHost])

  const openWorkspaceTab = useCallback(async (tab: WorkspaceSession) => {
    setActiveWorkspaceId(tab.id)
    await openSelectedHost(tab.host)
    await openSessionWorkspace(tab.host, {
      name: tab.sessionName,
      title: tab.title,
      attached: 0,
      windows: 1,
      createdAt: '',
    })
  }, [openSelectedHost, openSessionWorkspace])

  const fallbackSidebarHost = useMemo<HostItem | null>(() => {
    if (state.selectedHost) {
      return state.selectedHost
    }
    if (!state.terminalRequest) {
      return null
    }
    return {
      id: state.terminalRequest.hostUrl,
      label: state.terminalRequest.hostLabel || state.terminalRequest.hostUrl,
      url: state.terminalRequest.hostUrl,
      status: 'current',
      tokenState: state.terminalRequest.authToken ? 'cached' : 'missing',
      source: { saved: false, defaultConfigured: false, discovered: false },
    }
  }, [state.selectedHost, state.terminalRequest])

  const sidebarHosts = useMemo(() => {
    const source = state.hosts.length > 0 ? state.hosts : (fallbackSidebarHost ? [fallbackSidebarHost] : [])
    const deduped = new Map<string, HostItem>()
    for (const host of source) {
      deduped.set(host.id, host)
    }
    return [...deduped.values()]
  }, [fallbackSidebarHost, state.hosts])

  const sidebarSessionHost = state.selectedHost ?? fallbackSidebarHost

  const sidebarSessions = useMemo(() => {
    if (state.sessions.length > 0) {
      return state.sessions
    }
    if (!state.terminalRequest) {
      return [] as SessionItem[]
    }
    return [{
      name: state.terminalRequest.sessionName,
      title: state.terminalRequest.sessionName,
      attached: state.screen === 'terminal' ? 1 : 0,
      windows: 1,
      createdAt: '',
    }]
  }, [state.screen, state.sessions, state.terminalRequest])

  const occupiedSessions = useMemo(() => {
    if (!sidebarSessionHost) {
      return {}
    }
    return Object.fromEntries(
      workspaceSessions
        .filter((item) => item.host.id === sidebarSessionHost.id && item.occupiedMessage)
        .map((item) => [item.sessionName, item.occupiedMessage]),
    )
  }, [sidebarSessionHost, workspaceSessions])

  const currentContent = useMemo(() => {
    if (state.screen === 'terminal' && state.terminalRequest) {
      return (
        <TerminalScreen
          request={state.terminalRequest}
          inline
          onBack={() => setState((current) => ({ ...current, screen: current.selectedHost ? 'sessions' : 'hosts', terminalRequest: null }))}
          onSessionReplaced={(message) => {
            setWorkspaceSessions((current) => current.map((item) => (
              item.sessionName === state.terminalRequest?.sessionName
                ? { ...item, occupiedMessage: takeoverMessage(message), lastKnownState: 'occupied' }
                : item
            )))
            setState((current) => ({
              ...current,
              screen: 'sessions',
              terminalRequest: null,
              sessionError: takeoverMessage(message),
            }))
          }}
        />
      )
    }
    if (state.screen === 'settings') {
      return (
        <SettingsScreen
          fontScale={state.defaultFontScale}
          onSave={() => void persistSettings()}
          onFontScaleChange={(value) => setState((current) => ({ ...current, defaultFontScale: clampFontScale(value) }))}
        />
      )
    }
    if (state.selectedHost) {
      return (
        <SessionListScreen
          items={state.sessions}
          errorText={state.sessionError || (state.loading ? '(loading...)' : '')}
          onCreate={() => void createSelectedSession()}
          onDelete={(item) => void deleteSelectedSession(item.name)}
          onOpen={(item) => void openSessionWorkspace(state.selectedHost!, item)}
          onReclaim={(item) => void reclaimWorkspaceSession(item)}
          activeSessionName={activeWorkspaceId ? workspaceSessions.find((item) => item.id === activeWorkspaceId)?.sessionName : null}
          occupiedMessages={occupiedSessions}
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
          onRemove={(host) =>
            void removeManualHost(host.url)
              .then(reloadHosts)
              .catch((caught) => {
                const message = asMessage(caught, '(remove host failed)')
                setState((current) => ({ ...current, hostError: message }))
              })
          }
        />
        <View style={styles.inlineFormRow}>
          <TextInput
            value={manualHostUrl}
            onChangeText={setManualHostUrl}
            style={[styles.input, styles.hostInput]}
            placeholder='https://10.0.0.2:62589'
            placeholderTextColor={appColors.textSubtle}
            autoCapitalize='none'
            autoCorrect={false}
          />
          <TextInput
            value={manualHostToken}
            onChangeText={setManualHostToken}
            style={[styles.input, styles.tokenInput]}
            placeholder='token'
            placeholderTextColor={appColors.textSubtle}
            autoCapitalize='none'
            autoCorrect={false}
          />
          <Pressable testID='save-host' onPress={() => void saveHost()} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
            <Text style={styles.primaryButtonText}>저장</Text>
          </Pressable>
        </View>
      </View>
    )
  }, [
    activeWorkspaceId,
    createSelectedSession,
    deleteSelectedSession,
    manualHostToken,
    manualHostUrl,
    occupiedSessions,
    openSelectedHost,
    openSessionWorkspace,
    persistSettings,
    reclaimWorkspaceSession,
    reloadHosts,
    saveHost,
    state,
    workspaceSessions,
  ])

  const compactSidebar = tabletMode && sidebarCollapsed

  const sidebar = (
    <View style={[styles.sidebar, { width: compactSidebar ? 72 : drawerWidth }, compactSidebar && styles.sidebarCollapsed]}>
      <View style={styles.sidebarContent}>
        <ScrollView style={styles.sidebarBody} contentContainerStyle={styles.sidebarScroll} showsVerticalScrollIndicator={false}>
          {sidebarHosts.map((host) => (
            <Pressable
              key={host.id}
              onPress={() => void openSelectedHost(host)}
              style={({ pressed }) => [styles.navItem, state.selectedHost?.id === host.id && styles.navItemActive, pressed && styles.pressed]}
            >
              <Text numberOfLines={1} style={styles.navItemText}>{compactSidebar ? shortLabel(host.label) : host.label}</Text>
              {!compactSidebar ? <Text numberOfLines={1} style={styles.navMeta}>{host.status}</Text> : null}
            </Pressable>
          ))}

          {sidebarSessionHost && sidebarSessions.length > 0 ? <View style={styles.sidebarDivider} /> : null}
          {sidebarSessionHost ? sidebarSessions.map((item) => {
            const occupiedMessage = occupiedSessions[item.name]
            const sessionActive = activeWorkspaceId
              ? workspaceSessions.find((session) => session.id === activeWorkspaceId)?.sessionName === item.name
              : false
            return (
              <Pressable
                key={`${sidebarSessionHost.id}::${item.name}`}
                onPress={() => void openSessionWorkspace(sidebarSessionHost, item)}
                style={({ pressed }) => [styles.sessionSidebarItem, sessionActive && styles.navItemActive, pressed && styles.pressed]}
              >
                <Text numberOfLines={1} style={styles.navItemText}>{compactSidebar ? shortLabel(item.title || item.name) : (item.title || item.name)}</Text>
                {!compactSidebar ? (
                  <Text numberOfLines={1} style={[styles.navMeta, occupiedMessage && styles.navMetaDanger]}>
                    {occupiedMessage || attachedSidebarText(item)}
                  </Text>
                ) : null}
              </Pressable>
            )
          }) : null}

          {tabletMode && workspaceSessions.length > 0 ? <View style={styles.sidebarDivider} /> : null}
          {tabletMode ? workspaceSessions.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => void openWorkspaceTab(item)}
              style={({ pressed }) => [styles.workspaceItem, activeWorkspaceId === item.id && styles.navItemActive, pressed && styles.pressed]}
            >
              <Text numberOfLines={1} style={styles.navItemText}>{compactSidebar ? shortLabel(item.title) : item.title}</Text>
              {!compactSidebar ? (
                <Text numberOfLines={1} style={[styles.navMeta, item.occupiedMessage && styles.navMetaDanger]}>
                  {item.occupiedMessage || item.host.label}
                </Text>
              ) : null}
            </Pressable>
          )) : null}
        </ScrollView>

        <View style={styles.sidebarFooter}>
          <Pressable
            testID='sidebar-toggle'
            onPress={() => tabletMode ? setSidebarCollapsed((current) => !current) : setSidebarVisible(false)}
            style={({ pressed }) => [styles.footerHandleButton, pressed && styles.pressed]}
          >
            <Text style={styles.footerHandleText}>{tabletMode ? (compactSidebar ? '펼치기' : '접기') : '닫기'}</Text>
          </Pressable>
          <Pressable
            testID='nav-hosts'
            onPress={() => { setState((current) => ({ ...current, screen: 'hosts', selectedHost: null, terminalRequest: null })); setSidebarVisible(false) }}
            style={({ pressed }) => [styles.footerButton, state.screen === 'hosts' && !state.selectedHost && styles.navItemActive, pressed && styles.pressed]}
          >
            <Text style={styles.footerButtonText}>{compactSidebar ? '서' : '서버'}</Text>
          </Pressable>
          <Pressable
            testID='nav-settings'
            onPress={() => { setState((current) => ({ ...current, screen: 'settings', terminalRequest: null })); setSidebarVisible(false) }}
            style={({ pressed }) => [styles.footerButton, state.screen === 'settings' && styles.navItemActive, pressed && styles.pressed]}
          >
            <Text style={styles.footerButtonText}>{compactSidebar ? '설' : '설정'}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  )

  return (
    <View style={styles.container}>
      {!tabletMode && sidebarVisible ? (
        <View style={styles.sidebarOverlay}>
          <Pressable style={styles.sidebarBackdrop} onPress={() => setSidebarVisible(false)} />
          <View style={[styles.sidebarDrawer, { width: drawerWidth }]}>{sidebar}</View>
        </View>
      ) : null}

      <View style={styles.shell}>
        {tabletMode ? sidebar : null}
        <View style={styles.mainArea}>
          {!tabletMode && !sidebarVisible ? (
            <Pressable onPress={() => setSidebarVisible(true)} style={({ pressed }) => [styles.floatingMenuButton, pressed && styles.pressed]}>
              <Text style={styles.iconButtonText}>☰</Text>
            </Pressable>
          ) : null}
          <View style={styles.contentArea}>{currentContent}</View>
        </View>
      </View>
    </View>
  )
}

function workspaceId(host: HostItem, sessionName: string) {
  return `${host.id}::${sessionName}`
}

function isTakeoverMessage(message?: string) {
  return message?.toLowerCase().includes('replaced') ?? false
}

function takeoverMessage(message?: string) {
  if (!message) {
    return '점거당함 — 다른 연결이 이 세션을 사용 중'
  }
  return `점거당함 — ${message}`
}

function shortLabel(value: string) {
  const trimmed = value.replace(/^#\s*/, '').trim()
  return trimmed.slice(0, 2).toUpperCase()
}

function attachedSidebarText(item: SessionItem) {
  if (item.attached <= 0) {
    return `${item.windows}창`
  }
  if (item.attached === 1) {
    return `attached · ${item.windows}창`
  }
  return `attached ${item.attached} · ${item.windows}창`
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
    backgroundColor: appColors.background,
  },
  shell: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: appColors.background,
  },
  sidebar: {
    flex: 1,
    backgroundColor: appColors.surface,
    borderRightWidth: 1,
    borderRightColor: appColors.border,
    paddingHorizontal: appSpacing.sm,
    paddingTop: appSpacing.sm,
    paddingBottom: appSpacing.sm,
  },
  sidebarCollapsed: {
    paddingHorizontal: 6,
  },
  sidebarContent: {
    flex: 1,
  },
  sidebarBody: {
    flex: 1,
  },
  sidebarScroll: {
    gap: 6,
    paddingBottom: appSpacing.sm,
  },
  navItem: {
    backgroundColor: appColors.surfaceMuted,
    borderWidth: 1,
    borderColor: appColors.border,
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 3,
  },
  navItemActive: {
    backgroundColor: appColors.surfaceAccent,
    borderColor: appColors.primaryStrong,
  },
  navItemText: {
    color: appColors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  navMeta: {
    color: appColors.textMuted,
    fontSize: 11,
  },
  navMetaDanger: {
    color: appColors.danger,
    fontWeight: '700',
  },
  workspaceItem: {
    backgroundColor: appColors.surfaceMuted,
    borderWidth: 1,
    borderColor: appColors.border,
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 3,
  },
  sessionSidebarItem: {
    backgroundColor: appColors.surfaceMuted,
    borderWidth: 1,
    borderColor: appColors.border,
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 3,
  },
  sidebarDivider: {
    height: 1,
    backgroundColor: appColors.border,
    marginVertical: 4,
  },
  sidebarFooter: {
    gap: 6,
    paddingTop: appSpacing.sm,
    borderTopWidth: 1,
    borderTopColor: appColors.border,
  },
  footerHandleButton: {
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: appColors.border,
    backgroundColor: appColors.surfaceElevated,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  footerHandleText: {
    color: appColors.textMuted,
    fontSize: 11,
    fontWeight: '800',
  },
  footerButton: {
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: appColors.border,
    backgroundColor: appColors.surfaceMuted,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  footerButtonText: {
    color: appColors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  mainArea: {
    flex: 1,
    backgroundColor: appColors.background,
  },
  contentArea: {
    flex: 1,
  },
  hostsContainer: {
    flex: 1,
    gap: appSpacing.sm,
  },
  inlineFormRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: appSpacing.md,
    paddingBottom: appSpacing.md,
  },
  input: {
    borderWidth: 1,
    borderColor: appColors.borderStrong,
    backgroundColor: appColors.backgroundElevated,
    color: appColors.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 12,
  },
  hostInput: {
    flex: 1.4,
  },
  tokenInput: {
    flex: 1,
  },
  primaryButton: {
    backgroundColor: appColors.primaryStrong,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#eff6ff',
    fontWeight: '800',
  },
  iconButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: appRadius.pill,
    backgroundColor: appColors.surfaceElevated,
    borderWidth: 1,
    borderColor: appColors.border,
  },
  floatingMenuButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: appRadius.pill,
    backgroundColor: appColors.surfaceElevated,
    borderWidth: 1,
    borderColor: appColors.border,
  },
  iconButtonText: {
    color: appColors.text,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.84,
  },
  sidebarOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
    flexDirection: 'row',
  },
  sidebarBackdrop: {
    flex: 1,
    backgroundColor: appColors.backgroundOverlay,
  },
  sidebarDrawer: {
    height: '100%',
    backgroundColor: appColors.surface,
    borderRightWidth: 1,
    borderRightColor: appColors.border,
  },
})
