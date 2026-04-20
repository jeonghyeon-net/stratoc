import React from 'react'

const runtime = globalThis as {
  requestAnimationFrame?: (callback: (time: number) => void) => number
  cancelAnimationFrame?: (handle: number) => void
}

if (typeof runtime.requestAnimationFrame === 'undefined') {
  runtime.requestAnimationFrame = (callback) => setTimeout(() => callback(Date.now()), 0) as unknown as number
}

if (typeof runtime.cancelAnimationFrame === 'undefined') {
  runtime.cancelAnimationFrame = (handle) => clearTimeout(handle)
}

jest.mock('react-native-webview', () => {
  const React = require('react')
  const { View } = require('react-native')

  const WebView = React.forwardRef((props: Record<string, unknown>, ref: React.ForwardedRef<{ injectJavaScript: (script: string) => void; postMessage: (message: string) => void; requestFocus: () => void }>) => {
    React.useImperativeHandle(ref, () => ({
      injectJavaScript: (_script: string) => undefined,
      postMessage: (_message: string) => undefined,
      requestFocus: () => undefined,
    }))
    return React.createElement(View, props)
  })

  return { WebView }
})
