import React from 'react'
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { SessionItem } from '@/models/session'

export function SessionListScreen({
  items,
  onCreate,
  onDelete,
  onOpen,
}: {
  items: SessionItem[]
  onCreate: () => void
  onDelete: (item: SessionItem) => void
  onOpen: (item: SessionItem) => void
}) {
  return (
    <View style={styles.container}>
      <Pressable onPress={onCreate}>
        <Text>세션 추가</Text>
      </Pressable>
      <FlatList
        data={items}
        keyExtractor={(item) => item.name}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Pressable onPress={() => onOpen(item)}>
              <Text style={styles.title}>{item.title || item.name}</Text>
            </Pressable>
            <Pressable onPress={() => onDelete(item)}>
              <Text>삭제</Text>
            </Pressable>
          </View>
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 12,
    padding: 16,
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
})
