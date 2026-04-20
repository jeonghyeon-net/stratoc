import React from 'react'
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { SessionItem } from '@/models/session'

export function SessionListScreen({
  items,
  errorText,
  onBack,
  onCreate,
  onDelete,
  onOpen,
}: {
  items: SessionItem[]
  errorText: string
  onBack: () => void
  onCreate: () => void
  onDelete: (item: SessionItem) => void
  onOpen: (item: SessionItem) => void
}) {
  return (
    <View style={styles.container}>
      <View style={styles.actionsRow}>
        <Pressable onPress={onBack} style={styles.smallAction}>
          <Text>뒤로</Text>
        </Pressable>
        <Pressable onPress={onCreate} style={styles.smallAction}>
          <Text>세션 추가</Text>
        </Pressable>
      </View>
      {errorText ? <Text style={styles.error}>{errorText}</Text> : null}
      <FlatList
        data={items ?? []}
        keyExtractor={(item) => item.name}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Pressable onPress={() => onOpen(item)}>
              <Text style={styles.title}>{item.title || item.name}</Text>
              <Text style={styles.meta}>{attachedText(item.attached)}</Text>
              <Text style={styles.meta}>{item.createdAt}</Text>
            </Pressable>
            <Pressable onPress={() => onDelete(item)}>
              <Text style={styles.delete}>삭제</Text>
            </Pressable>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.meta}>(empty)</Text>}
      />
    </View>
  )
}

function attachedText(attached: number) {
  if (attached <= 0) {
    return 'not attached'
  }
  if (attached === 1) {
    return 'attached'
  }
  return `attached ${attached}`
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
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  meta: {
    color: '#71717a',
  },
  delete: {
    color: '#dc2626',
  },
  error: {
    color: '#dc2626',
  },
})
