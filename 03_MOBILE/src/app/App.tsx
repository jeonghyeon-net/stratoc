import React from 'react'
import { SafeAreaView, StyleSheet, Text } from 'react-native'

export function App() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Stratoc Mobile</Text>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
})
