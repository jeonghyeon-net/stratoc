import React from 'react'
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { HostItem } from '@/models/host'
import { appColors, appSpacing } from '@/theme/theme'

export function HostListScreen({
  items,
  errorText,
  onRefresh,
  onOpen,
  onRemove,
}: {
  items: HostItem[]
  errorText: string
  onRefresh: () => void
  onOpen: (item: HostItem) => void
  onRemove: (item: HostItem) => void
}) {
  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <Pressable testID='hosts-refresh' onPress={onRefresh} style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
          <Text style={styles.buttonText}>새로고침</Text>
        </Pressable>
        <Text style={styles.counter}>{items.length}</Text>
      </View>

      {errorText ? <Text style={styles.error}>{errorText}</Text> : null}

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Pressable onPress={() => onOpen(item)} style={({ pressed }) => [styles.rowPressable, pressed && styles.pressed]}>
              <View style={styles.mainColumn}>
                <Text style={styles.name}>{item.label}</Text>
                <Text style={styles.meta}>{item.url}</Text>
              </View>
              <View style={styles.sideColumn}>
                <Text style={styles.state}>{item.status}</Text>
                <Text style={styles.meta}>{formatSource(item)}</Text>
              </View>
            </Pressable>
            {item.source.saved ? (
              <Pressable onPress={() => onRemove(item)} style={({ pressed }) => [styles.removeButton, pressed && styles.pressed]}>
                <Text style={styles.removeText}>삭제</Text>
              </Pressable>
            ) : null}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>서버 없음</Text>
          </View>
        }
      />
    </View>
  )
}

function formatSource(item: HostItem) {
  const labels = []
  if (item.source.saved) labels.push('saved')
  if (item.source.defaultConfigured) labels.push('default')
  if (item.source.discovered) labels.push('discovered')
  const tokenText = item.tokenState === 'cached' ? 'token cached' : 'token missing'
  return [...labels, tokenText].join(' · ')
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
  button: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: appColors.border,
    backgroundColor: appColors.surfaceElevated,
  },
  buttonText: {
    color: appColors.text,
    fontWeight: '700',
    fontSize: 12,
  },
  listContent: {
    gap: 1,
    backgroundColor: appColors.border,
    flexGrow: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: appColors.surface,
  },
  rowPressable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  mainColumn: {
    flex: 1,
    gap: 3,
  },
  sideColumn: {
    width: 120,
    alignItems: 'flex-end',
    gap: 3,
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
  meta: {
    color: appColors.textMuted,
    fontSize: 11,
  },
  removeButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderLeftWidth: 1,
    borderLeftColor: appColors.border,
    backgroundColor: appColors.dangerSoft,
  },
  removeText: {
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
  error: {
    color: appColors.danger,
    fontSize: 12,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.84,
  },
})
