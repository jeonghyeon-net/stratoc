import React from 'react'
import { findNodeHandle, Platform, requireNativeComponent, UIManager, View, ViewProps } from 'react-native'

export type NativeTerminalInlineViewProps = ViewProps & {
  hostUrl: string
  authToken: string
  sessionName: string
  fontScale: number
}

const COMPONENT_NAME = 'StratocTerminalInlineView'

export function hasNativeTerminalInlineView() {
  if (Platform.OS !== 'android') {
    return false
  }
  return Boolean(UIManager.getViewManagerConfig?.(COMPONENT_NAME))
}

let cachedNativeComponent: React.ComponentType<NativeTerminalInlineViewProps> | null = null

type NativeTerminalInlineHandle = {
  sendSequence: (sequence: string) => void
  sendKey: (keyCode: number, keyMod: number) => void
  setSoftCtrlArmed: (armed: boolean) => void
  setSoftAltArmed: (armed: boolean) => void
  setSoftShiftArmed: (armed: boolean) => void
}

function resolveNativeComponent() {
  if (cachedNativeComponent) {
    return cachedNativeComponent
  }
  if (!hasNativeTerminalInlineView()) {
    cachedNativeComponent = View as unknown as React.ComponentType<NativeTerminalInlineViewProps>
    return cachedNativeComponent
  }
  cachedNativeComponent = requireNativeComponent<NativeTerminalInlineViewProps>(COMPONENT_NAME)
  return cachedNativeComponent
}

export const NativeTerminalInlineView = React.forwardRef<NativeTerminalInlineHandle, NativeTerminalInlineViewProps>((props, ref) => {
  const NativeComponent = resolveNativeComponent()
  const nativeRef = React.useRef(null)

  React.useImperativeHandle(ref, () => ({
    sendSequence(sequence: string) {
      if (!sequence || Platform.OS !== 'android') {
        return
      }
      const node = findNodeHandle(nativeRef.current)
      const config = UIManager.getViewManagerConfig?.(COMPONENT_NAME)
      const command = config?.Commands?.sendSequence
      if (!node || command == null) {
        return
      }
      UIManager.dispatchViewManagerCommand(node, command, [sequence])
    },
    sendKey(keyCode: number, keyMod: number) {
      if (Platform.OS !== 'android') {
        return
      }
      const node = findNodeHandle(nativeRef.current)
      const config = UIManager.getViewManagerConfig?.(COMPONENT_NAME)
      const command = config?.Commands?.sendKey
      if (!node || command == null) {
        return
      }
      UIManager.dispatchViewManagerCommand(node, command, [keyCode, keyMod])
    },
    setSoftCtrlArmed(armed: boolean) {
      if (Platform.OS !== 'android') {
        return
      }
      const node = findNodeHandle(nativeRef.current)
      const config = UIManager.getViewManagerConfig?.(COMPONENT_NAME)
      const command = config?.Commands?.setSoftCtrlArmed
      if (!node || command == null) {
        return
      }
      UIManager.dispatchViewManagerCommand(node, command, [armed])
    },
    setSoftAltArmed(armed: boolean) {
      if (Platform.OS !== 'android') {
        return
      }
      const node = findNodeHandle(nativeRef.current)
      const config = UIManager.getViewManagerConfig?.(COMPONENT_NAME)
      const command = config?.Commands?.setSoftAltArmed
      if (!node || command == null) {
        return
      }
      UIManager.dispatchViewManagerCommand(node, command, [armed])
    },
    setSoftShiftArmed(armed: boolean) {
      if (Platform.OS !== 'android') {
        return
      }
      const node = findNodeHandle(nativeRef.current)
      const config = UIManager.getViewManagerConfig?.(COMPONENT_NAME)
      const command = config?.Commands?.setSoftShiftArmed
      if (!node || command == null) {
        return
      }
      UIManager.dispatchViewManagerCommand(node, command, [armed])
    },
  }), [])

  return React.createElement(NativeComponent as React.ComponentType<NativeTerminalInlineViewProps & { ref?: React.Ref<unknown> }>, {
    ...props,
    ref: nativeRef,
  })
})

NativeTerminalInlineView.displayName = 'NativeTerminalInlineView'
