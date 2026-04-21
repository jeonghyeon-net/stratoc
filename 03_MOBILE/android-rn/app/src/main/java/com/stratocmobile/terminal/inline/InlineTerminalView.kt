package com.stratocmobile.terminal.inline

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.graphics.Color
import android.view.ViewGroup
import android.widget.FrameLayout
import android.widget.Toast
import com.stratocmobile.bridge.TerminalModule
import com.stratocmobile.terminal.ime.TerminalImeController
import com.stratocmobile.terminal.transport.RemoteTerminalSocket
import com.stratocmobile.terminal.transport.insecureWebSocketClient
import com.stratocmobile.terminal.transport.isBenignDisconnectMessage
import com.termux.view.NativeRemoteTerminalView

class InlineTerminalView(context: Context) : FrameLayout(context) {
    private var hostUrl: String = ""
    private var authToken: String = ""
    private var sessionName: String = ""
    private var fontScale: Float = 1f

    private var terminalView: NativeRemoteTerminalView? = null
    private var imeController: TerminalImeController? = null
    private var socket: RemoteTerminalSocket? = null
    private var connectStarted = false
    private var currentColumns = 0
    private var currentRows = 0

    init {
        setBackgroundColor(Color.BLACK)
        rebuildTerminalView()
    }

    fun setHostUrl(value: String) {
        if (hostUrl == value) return
        hostUrl = value
        rebuildTerminalView()
    }

    fun setAuthToken(value: String) {
        if (authToken == value) return
        authToken = value
        rebuildTerminalView()
    }

    fun setSessionName(value: String) {
        if (sessionName == value) return
        sessionName = value
        rebuildTerminalView()
    }

    fun setFontScale(value: Float) {
        if (fontScale == value) return
        fontScale = value
        terminalView?.setTerminalFontScale(value)
    }

    fun sendSequence(sequence: String) {
        if (sequence.isEmpty()) return
        terminalView?.sendEscapeSequence(sequence)
        focusTerminal()
    }

    fun sendKey(keyCode: Int, keyMod: Int) {
        terminalView?.sendKeyCode(keyCode, keyMod)
        focusTerminal()
    }

    fun setSoftCtrlArmed(armed: Boolean) {
        terminalView?.setSoftCtrlArmed(armed)
    }

    fun setSoftAltArmed(armed: Boolean) {
        terminalView?.setSoftAltArmed(armed)
    }

    fun setSoftShiftArmed(armed: Boolean) {
        terminalView?.setSoftShiftArmed(armed)
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        focusTerminal()
    }

    override fun onDetachedFromWindow() {
        teardownSocket("view detached")
        super.onDetachedFromWindow()
    }

    private fun rebuildTerminalView() {
        teardownSocket("session switching")
        removeAllViews()
        currentColumns = 0
        currentRows = 0
        connectStarted = false
        terminalView = NativeRemoteTerminalView(context).also { view ->
            view.layoutParams = LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)
            view.isClickable = true
            view.isFocusable = true
            view.isFocusableInTouchMode = true
            view.setTerminalFontScale(fontScale)
            view.setCallbacks(object : NativeRemoteTerminalView.Callbacks {
                override fun onTerminalSizeChanged(columns: Int, rows: Int) {
                    currentColumns = columns
                    currentRows = rows
                    if (connectStarted) {
                        socket?.sendResize(columns, rows)
                    } else {
                        openConnection()
                    }
                }

                override fun onWriteBytes(bytes: ByteArray) {
                    socket?.sendInput(bytes)
                }

                override fun onCopyText(text: String) {
                    post { copyTextToClipboard(text) }
                }

                override fun onPasteRequested() {
                    post { pasteClipboard() }
                }

                override fun onBell() {
                    post { Toast.makeText(context, "bell", Toast.LENGTH_SHORT).show() }
                }

                override fun onTitleChanged(title: String?) = Unit

                override fun onSingleTapUp() {
                    post { focusTerminal() }
                }

                override fun onSoftCtrlStateChanged(armed: Boolean) {
                    TerminalModule.emitSoftCtrlState(sessionName, hostUrl, armed)
                }

                override fun onSoftAltStateChanged(armed: Boolean) {
                    TerminalModule.emitSoftAltState(sessionName, hostUrl, armed)
                }

                override fun onSoftShiftStateChanged(armed: Boolean) {
                    TerminalModule.emitSoftShiftState(sessionName, hostUrl, armed)
                }
            })
            view.setOnClickListener { focusTerminal() }
            addView(view)
        }
        imeController = terminalView?.let { TerminalImeController(context, it) { hasWindowFocus() } }
        focusTerminal()
    }

    private fun openConnection() {
        if (hostUrl.isBlank() || sessionName.isBlank() || currentColumns <= 0 || currentRows <= 0 || connectStarted) {
            return
        }
        val client = insecureWebSocketClient()
        socket = RemoteTerminalSocket(
            client = client,
            hostUrl = hostUrl,
            authToken = authToken,
            sessionName = sessionName,
            listener = object : RemoteTerminalSocket.Listener {
                override fun onOpened() {
                    connectStarted = true
                    TerminalModule.emitOpened(sessionName, hostUrl)
                }

                override fun onText(bytes: ByteArray) {
                    post { terminalView?.append(bytes) }
                }

                override fun onBinary(bytes: ByteArray) {
                    post { terminalView?.append(bytes) }
                }

                override fun onDisconnected(message: String, shouldFinish: Boolean, showToast: Boolean) {
                    connectStarted = false
                    val normalizedMessage = if (isBenignDisconnectMessage(message)) "disconnected" else message
                    if (shouldFinish) {
                        if (normalizedMessage.contains("replaced", ignoreCase = true)) {
                            TerminalModule.emitDisconnected(sessionName, hostUrl, normalizedMessage)
                        }
                        TerminalModule.emitClosed("remote", sessionName, hostUrl, normalizedMessage)
                    } else {
                        TerminalModule.emitDisconnected(sessionName, hostUrl, normalizedMessage)
                    }
                    if (showToast && !isBenignDisconnectMessage(message)) {
                        post { Toast.makeText(context, normalizedMessage, Toast.LENGTH_SHORT).show() }
                    }
                }

                override fun onFailure(message: String) {
                    connectStarted = false
                    TerminalModule.emitDisconnected(sessionName, hostUrl, message)
                    post { Toast.makeText(context, message, Toast.LENGTH_SHORT).show() }
                }
            },
        )
        connectStarted = true
        socket?.connect(currentColumns, currentRows)
    }

    private fun teardownSocket(reason: String) {
        connectStarted = false
        socket?.close(reason)
        socket = null
    }

    private fun focusTerminal() {
        terminalView?.requestFocus()
        terminalView?.requestFocusFromTouch()
        imeController?.focus()
    }

    private fun pasteClipboard() {
        val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as? ClipboardManager ?: return
        val item = clipboard.primaryClip?.getItemAt(0) ?: return
        val text = item.coerceToText(context)?.toString().orEmpty()
        if (text.isNotEmpty()) {
            terminalView?.sendPastedText(text)
        }
    }

    private fun copyTextToClipboard(text: String) {
        if (text.isEmpty()) return
        val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as? ClipboardManager ?: return
        clipboard.setPrimaryClip(ClipData.newPlainText("terminal-selection", text))
        Toast.makeText(context, "copied", Toast.LENGTH_SHORT).show()
    }
}
