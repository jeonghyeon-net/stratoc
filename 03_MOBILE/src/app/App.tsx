import React from 'react'
import { SafeAreaView, StyleSheet } from 'react-native'
import { AppNavigation } from './navigation'

export function App() {
  return (
    <SafeAreaView style={styles.container}>
      <AppNavigation />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
})
