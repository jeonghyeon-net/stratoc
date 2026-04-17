import React from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'

export function SettingsScreen({
  serverUrl,
  authToken,
  onBack,
  onSave,
  onServerUrlChange,
  onAuthTokenChange,
}: {
  serverUrl: string
  authToken: string
  onBack: () => void
  onSave: () => void
  onServerUrlChange: (value: string) => void
  onAuthTokenChange: (value: string) => void
}) {
  return (
    <View style={styles.container}>
      <View style={styles.actionsRow}>
        <Pressable onPress={onBack} style={styles.smallAction}>
          <Text>뒤로</Text>
        </Pressable>
        <Pressable onPress={onSave} style={styles.smallAction}>
          <Text>저장</Text>
        </Pressable>
      </View>
      <Text>기본 서버</Text>
      <TextInput value={serverUrl} onChangeText={onServerUrlChange} style={styles.input} />
      <Text>인증 토큰</Text>
      <TextInput value={authToken} onChangeText={onAuthTokenChange} style={styles.input} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 8,
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
  input: {
    borderWidth: 1,
    borderColor: '#d4d4d4',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
})
