import React from 'react'
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { HostItem } from '@/models/host'

export function HostListScreen({
  items,
  errorText,
  onRefresh,
  onOpen,
  onOpenSettings,
  onRemove,
}: {
  items: HostItem[]
  errorText: string
  onRefresh: () => void
  onOpen: (item: HostItem) => void
  onOpenSettings: () => void
  onRemove: (item: HostItem) => void
}) {
  return (
    <View style={styles.container}>
      <View style={styles.actionsRow}>
        <Pressable onPress={onRefresh} style={styles.smallAction}>
          <Text>새로고침</Text>
        </Pressable>
        <Pressable onPress={onOpenSettings} style={styles.smallAction}>
          <Text>설정</Text>
        </Pressable>
      </View>
      {errorText ? <Text style={styles.error}>{errorText}</Text> : null}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Pressable onPress={() => onOpen(item)}>
              <Text style={styles.label}>{item.label}</Text>
              <Text>{item.status}</Text>
              <Text style={styles.hint}>{formatSource(item)}</Text>
            </Pressable>
            {item.source.saved ? (
              <Pressable onPress={() => onRemove(item)}>
                <Text style={styles.remove}>삭제</Text>
              </Pressable>
            ) : null}
          </View>
        )}
        ListEmptyComponent={<Text style={styles.hint}>(empty)</Text>}
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
    gap: 12,
    padding: 16,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  smallAction: {
    borderRadius: 8,
    backgroundColor: '#f4f4f5',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  hint: {
    color: '#71717a',
  },
  remove: {
    color: '#dc2626',
  },
  error: {
    color: '#dc2626',
  },
})
