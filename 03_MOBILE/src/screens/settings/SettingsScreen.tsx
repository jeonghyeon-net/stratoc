import React from 'react'
import { StyleSheet, Text, TextInput, View } from 'react-native'

export function SettingsScreen({
  serverUrl,
  authToken,
  onServerUrlChange,
  onAuthTokenChange,
}: {
  serverUrl: string
  authToken: string
  onServerUrlChange: (value: string) => void
  onAuthTokenChange: (value: string) => void
}) {
  return (
    <View style={styles.container}>
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
  input: {
    borderWidth: 1,
    borderColor: '#d4d4d4',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
})
