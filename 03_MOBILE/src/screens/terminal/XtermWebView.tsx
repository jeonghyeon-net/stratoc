import React, {
  ForwardedRef,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import { WebView, WebViewMessageEvent } from 'react-native-webview'
import htmlString from './xtermHtml'
import { encodeBytes, TerminalWebInboundMessage, TerminalWebOutboundMessage } from './xtermBridge'

export type TerminalWebViewHandle = {
  write(data: Uint8Array): void
  clear(): void
  focus(): void
  resize(size: { cols: number; rows: number }): void
  fit(): void
}

export type TerminalWebViewProps = {
  style?: React.ComponentProps<typeof WebView>['style']
  onInitialized?: () => void
  onData?: (data: string) => void
  size?: { cols: number; rows: number }
  options?: Record<string, unknown>
}

const defaultOptions = {
  allowProposedApi: true,
  convertEol: true,
  cursorBlink: true,
  fontFamily: 'Menlo, ui-monospace, monospace',
  fontSize: 14,
  scrollback: 10000,
  theme: {
    background: '#000000',
    foreground: '#e2e8f0',
    cursor: '#f8fafc',
    selectionBackground: '#334155',
    black: '#000000',
    red: '#ef4444',
    green: '#22c55e',
    yellow: '#eab308',
    blue: '#38bdf8',
    magenta: '#c084fc',
    cyan: '#22d3ee',
    white: '#e2e8f0',
    brightBlack: '#475569',
    brightRed: '#f87171',
    brightGreen: '#4ade80',
    brightYellow: '#facc15',
    brightBlue: '#7dd3fc',
    brightMagenta: '#d8b4fe',
    brightCyan: '#67e8f9',
    brightWhite: '#f8fafc',
  },
} as const

const defaultWebViewProps = {
  keyboardDisplayRequiresUserAction: false,
  pullToRefreshEnabled: false,
  bounces: false,
  textInteractionEnabled: false,
  allowsLinkPreview: false,
  setSupportMultipleWindows: false,
  overScrollMode: 'never' as const,
  setBuiltInZoomControls: false,
  setDisplayZoomControls: false,
  textZoom: 100,
  originWhitelist: ['*'],
  scalesPageToFit: false,
  contentMode: 'mobile' as const,
}

export const XtermWebView = forwardRef(function XtermWebView(
  { style, onInitialized, onData, size, options }: TerminalWebViewProps,
  forwardedRef: ForwardedRef<TerminalWebViewHandle>,
) {
  const webViewRef = useRef<WebView>(null)
  const [initialized, setInitialized] = useState(false)
  const pendingWriteRef = useRef<Uint8Array | null>(null)
  const frameRef = useRef<number | null>(null)
  const lastSizeRef = useRef<{ cols: number; rows: number } | null>(null)
  const mergedOptions = useMemo(() => ({ ...defaultOptions, ...(options ?? {}) }), [options])

  const sendMessage = useCallback((message: TerminalWebOutboundMessage) => {
    if (!webViewRef.current) {
      return
    }
    webViewRef.current.postMessage(JSON.stringify(message))
  }, [])

  const flush = useCallback(() => {
    const pending = pendingWriteRef.current
    if (!pending || pending.length === 0) {
      return
    }
    pendingWriteRef.current = null
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }
    sendMessage({ type: 'write', bStr: encodeBytes(pending) })
  }, [sendMessage])

  const scheduleFlush = useCallback(() => {
    if (frameRef.current !== null) {
      return
    }
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null
      flush()
    })
  }, [flush])

  const write = useCallback((data: Uint8Array) => {
    if (data.length === 0) {
      return
    }
    if (!pendingWriteRef.current) {
      pendingWriteRef.current = data
    } else {
      const current = pendingWriteRef.current
      const merged = new Uint8Array(current.length + data.length)
      merged.set(current, 0)
      merged.set(data, current.length)
      pendingWriteRef.current = merged
    }
    if ((pendingWriteRef.current?.length ?? 0) >= 8 * 1024) {
      flush()
      return
    }
    scheduleFlush()
  }, [flush, scheduleFlush])

  useImperativeHandle(forwardedRef, () => ({
    write,
    clear() {
      sendMessage({ type: 'clear' })
    },
    focus() {
      sendMessage({ type: 'focus' })
    },
    resize(nextSize) {
      lastSizeRef.current = nextSize
      sendMessage({ type: 'resize', cols: nextSize.cols, rows: nextSize.rows })
    },
    fit() {
      sendMessage({ type: 'fit' })
    },
  }), [sendMessage, write])

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current)
      }
      frameRef.current = null
      pendingWriteRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!initialized || !size) {
      return
    }
    const lastSize = lastSizeRef.current
    if (lastSize?.cols === size.cols && lastSize?.rows === size.rows) {
      return
    }
    lastSizeRef.current = size
    sendMessage({ type: 'resize', cols: size.cols, rows: size.rows })
    sendMessage({ type: 'fit' })
  }, [initialized, sendMessage, size])

  useEffect(() => {
    if (!initialized) {
      return
    }
    sendMessage({ type: 'setOptions', opts: mergedOptions })
    sendMessage({ type: 'fit' })
  }, [initialized, mergedOptions, sendMessage])

  const handleMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const message = JSON.parse(event.nativeEvent.data) as TerminalWebInboundMessage
      if (message.type === 'initialized') {
        setInitialized(true)
        onInitialized?.()
        sendMessage({ type: 'setOptions', opts: mergedOptions })
        sendMessage({ type: 'fit' })
        return
      }
      if (message.type === 'input') {
        onData?.(message.str)
        return
      }
      if (message.type === 'debug') {
        return
      }
    } catch {
      return
    }
  }, [mergedOptions, onData, onInitialized, sendMessage])

  return (
    <WebView
      ref={webViewRef}
      source={{ html: htmlString }}
      onMessage={handleMessage}
      style={style}
      injectedJavaScriptObject={mergedOptions}
      injectedJavaScriptBeforeContentLoaded={bridgeBootstrapScript(mergedOptions)}
      javaScriptCanOpenWindowsAutomatically={false}
      onShouldStartLoadWithRequest={(request) => isAllowedTerminalUrl(request.url)}
      {...defaultWebViewProps}
    />
  )
})

function isAllowedTerminalUrl(url: string) {
  return url === 'about:blank'
    || url.startsWith('about:srcdoc')
    || url.startsWith('data:text/html')
    || url.startsWith('file://')
}

function bridgeBootstrapScript(options: Record<string, unknown>) {
  const background = typeof options.theme === 'object' && options.theme && 'background' in options.theme
    ? String((options.theme as Record<string, unknown>).background)
    : '#000000'
  return `
    (function() {
      if (!window.__STRATOC_TERM_POSTMESSAGE_BRIDGE__) {
        window.__STRATOC_TERM_POSTMESSAGE_BRIDGE__ = true;
        window.addEventListener('message', function(event) {
          if (typeof event.data !== 'string') {
            return;
          }
          try {
            var parsed = JSON.parse(event.data);
            if (!parsed || typeof parsed.type !== 'string') {
              return;
            }
            window.dispatchEvent(new MessageEvent('message', { data: parsed }));
          } catch (_error) {
            return;
          }
        }, true);
      }
      document.body.style.backgroundColor = ${JSON.stringify(background)};
      true;
    })();
  `
}
