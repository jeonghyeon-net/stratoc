import React from 'react'
import { Platform, SafeAreaView, StatusBar, StyleSheet, View } from 'react-native'
import { AppNavigation } from './navigation'
import { appColors } from '@/theme/theme'

export function App() {
  const Container = Platform.OS === 'ios' ? SafeAreaView : View

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle='light-content'
        backgroundColor={appColors.background}
        translucent={false}
      />
      <Container style={styles.container}>
        <AppNavigation />
      </Container>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: appColors.background,
  },
  container: {
    flex: 1,
    backgroundColor: appColors.background,
  },
})
