import React from 'react'
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { SessionItem } from '@/models/session'
import { appColors, appSpacing } from '@/theme/theme'

export function SessionListScreen({
  items,
  errorText,
  onCreate,
  onDelete,
  onOpen,
  onReclaim,
  activeSessionName,
  occupiedMessages,
}: {
  items: SessionItem[]
  errorText: string
  onCreate: () => void
  onDelete: (item: SessionItem) => void
  onOpen: (item: SessionItem) => void
  onReclaim?: (item: SessionItem) => void
  activeSessionName?: string | null
  occupiedMessages?: Record<string, string>
}) {
  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <Pressable testID='sessions-create' onPress={onCreate} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
          <Text style={styles.primaryButtonText}>새 세션</Text>
        </Pressable>
        <Text style={styles.counter}>{items.length}</Text>
      </View>

      {errorText ? <Text style={styles.error}>{errorText}</Text> : null}

      <FlatList
        data={items ?? []}
        keyExtractor={(item) => item.name}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const occupiedMessage = occupiedMessages?.[item.name]
          const isActive = activeSessionName === item.name
          return (
            <View style={styles.row}>
              <Pressable onPress={() => onOpen(item)} style={({ pressed }) => [styles.rowPressable, pressed && styles.pressed]}>
                <View style={styles.mainColumn}>
                  <Text style={styles.name}>{item.title || item.name}</Text>
                  <Text style={styles.meta}>{item.name}</Text>
                </View>
                <View style={styles.sideColumn}>
                  <Text style={[styles.state, isActive && styles.stateActive, occupiedMessage && styles.stateOccupied]}>
                    {occupiedMessage ? '점거' : isActive ? 'active' : attachedText(item.attached)}
                  </Text>
                  <Text style={[styles.meta, occupiedMessage && styles.stateOccupied]} numberOfLines={1}>
                    {occupiedMessage || `${item.windows}창 · ${item.createdAt || '-'}`}
                  </Text>
                </View>
              </Pressable>
              <View style={styles.actions}>
                {occupiedMessage ? (
                  <Pressable onPress={() => (onReclaim ?? onOpen)(item)} style={({ pressed }) => [styles.actionPrimary, pressed && styles.pressed]}>
                    <Text style={styles.actionPrimaryText}>되찾기</Text>
                  </Pressable>
                ) : (
                  <Pressable onPress={() => onOpen(item)} style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}>
                    <Text style={styles.actionButtonText}>열기</Text>
                  </Pressable>
                )}
                <Pressable onPress={() => onDelete(item)} style={({ pressed }) => [styles.actionDanger, pressed && styles.pressed]}>
                  <Text style={styles.actionDangerText}>삭제</Text>
                </Pressable>
              </View>
            </View>
          )
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>세션 없음</Text>
          </View>
        }
      />
    </View>
  )
}

function attachedText(attached: number) {
  if (attached <= 0) {
    return 'idle'
  }
  if (attached === 1) {
    return 'attached'
  }
  return `attached ${attached}`
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: appSpacing.md,
    paddingTop: appSpacing.md,
    paddingBottom: appSpacing.sm,
    gap: appSpacing.sm,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  counter: {
    color: appColors.textSubtle,
    fontSize: 12,
    fontWeight: '700',
  },
  primaryButton: {
    backgroundColor: appColors.primaryStrong,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  primaryButtonText: {
    color: '#F8F8F2',
    fontSize: 12,
    fontWeight: '800',
  },
  error: {
    color: appColors.danger,
    fontSize: 12,
    fontWeight: '700',
  },
  listContent: {
    gap: 1,
    backgroundColor: appColors.border,
    flexGrow: 1,
  },
  row: {
    flexDirection: 'row',
    backgroundColor: appColors.surface,
  },
  rowPressable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  mainColumn: {
    flex: 1,
    gap: 3,
  },
  sideColumn: {
    width: 132,
    alignItems: 'flex-end',
    gap: 3,
  },
  actions: {
    width: 108,
    borderLeftWidth: 1,
    borderLeftColor: appColors.border,
  },
  name: {
    color: appColors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  state: {
    color: appColors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  stateActive: {
    color: appColors.success,
  },
  stateOccupied: {
    color: appColors.danger,
  },
  meta: {
    color: appColors.textMuted,
    fontSize: 11,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: appColors.surfaceElevated,
  },
  actionButtonText: {
    color: appColors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  actionPrimary: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: appColors.primaryStrong,
  },
  actionPrimaryText: {
    color: '#F8F8F2',
    fontSize: 12,
    fontWeight: '800',
  },
  actionDanger: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: appColors.border,
    backgroundColor: appColors.dangerSoft,
  },
  actionDangerText: {
    color: appColors.danger,
    fontSize: 12,
    fontWeight: '700',
  },
  emptyState: {
    flex: 1,
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: appColors.surface,
  },
  emptyText: {
    color: appColors.textMuted,
    fontSize: 12,
  },
  pressed: {
    opacity: 0.84,
  },
})
