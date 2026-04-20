import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { appColors, appSpacing } from '@/theme/theme'

export function SettingsScreen({
  fontScale,
  onSave,
  onFontScaleChange,
}: {
  fontScale: number
  onSave: () => void
  onFontScaleChange: (value: number) => void
}) {
  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <Text testID='settings-font-scale-label' style={styles.label}>글씨</Text>
        <View style={styles.controls}>
          <Pressable onPress={() => onFontScaleChange(Math.max(0.85, Number((fontScale - 0.1).toFixed(2))))} style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
            <Text style={styles.buttonText}>A-</Text>
          </Pressable>
          <Text style={styles.value}>{Math.round(fontScale * 100)}%</Text>
          <Pressable onPress={() => onFontScaleChange(Math.min(1.45, Number((fontScale + 0.1).toFixed(2))))} style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
            <Text style={styles.buttonText}>A+</Text>
          </Pressable>
          <Pressable onPress={onSave} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
            <Text style={styles.primaryButtonText}>저장</Text>
          </Pressable>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: appSpacing.md,
    paddingTop: appSpacing.md,
    paddingBottom: appSpacing.sm,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: appColors.border,
    paddingBottom: appSpacing.sm,
  },
  label: {
    color: appColors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  value: {
    color: appColors.text,
    fontSize: 12,
    fontWeight: '700',
    minWidth: 48,
    textAlign: 'center',
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
    fontSize: 12,
    fontWeight: '700',
  },
  primaryButton: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: appColors.primaryStrong,
  },
  primaryButtonText: {
    color: '#F8F8F2',
    fontSize: 12,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.84,
  },
})
