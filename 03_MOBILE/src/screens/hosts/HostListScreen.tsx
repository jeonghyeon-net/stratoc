import React from 'react'
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { HostItem } from '@/models/host'

export function HostListScreen({
  items,
  onRefresh,
  onOpen,
}: {
  items: HostItem[]
  onRefresh: () => void
  onOpen: (item: HostItem) => void
}) {
  return (
    <View style={styles.container}>
      <Pressable onPress={onRefresh} style={styles.refreshButton}>
        <Text>새로고침</Text>
      </Pressable>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable onPress={() => onOpen(item)} style={styles.card}>
            <Text style={styles.label}>{item.label}</Text>
            <Text>{item.status}</Text>
          </Pressable>
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
  refreshButton: {
    alignSelf: 'flex-start',
  },
  card: {
    paddingVertical: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
})
