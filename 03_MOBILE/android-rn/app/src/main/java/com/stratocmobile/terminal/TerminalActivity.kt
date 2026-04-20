package com.stratocmobile.terminal

import android.app.Activity
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.widget.Button
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import com.stratocmobile.bridge.TerminalModule
import com.stratocmobile.terminal.ime.TerminalImeController
import com.stratocmobile.terminal.transport.RemoteTerminalSocket
import com.stratocmobile.terminal.transport.insecureWebSocketClient
import com.stratocmobile.terminal.transport.isBenignDisconnectMessage
import com.termux.view.NativeRemoteTerminalView

class TerminalActivity : Activity() {
    private lateinit var terminalView: NativeRemoteTerminalView
    private lateinit var statusView: TextView
    private lateinit var imeController: TerminalImeController
    private lateinit var socket: RemoteTerminalSocket

    private var closed = false
    private var connectStarted = false
    private var emittedClosed = false
    private var currentColumns = 0
    private var currentRows = 0

    private val hostUrl: String by lazy { intent.getStringExtra(EXTRA_HOST_URL).orEmpty() }
    private val authToken: String by lazy { intent.getStringExtra(EXTRA_AUTH_TOKEN).orEmpty() }
    private val sessionName: String by lazy { intent.getStringExtra(EXTRA_SESSION_NAME).orEmpty() }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        @Suppress("DEPRECATION")
        window.setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE)
        setContentView(createContentView())
        imeController = TerminalImeController(this, terminalView) { window.decorView.hasWindowFocus() }
        socket = RemoteTerminalSocket(
            client = insecureWebSocketClient(),
            hostUrl = hostUrl,
            authToken = authToken,
            sessionName = sessionName,
            listener = object : RemoteTerminalSocket.Listener {
                override fun onOpened() {
                    runOnUiThread {
                        connectStarted = true
                        setStatus("connected")
                        TerminalModule.emitOpened(sessionName)
                    }
                }

                override fun onText(bytes: ByteArray) {
                    runOnUiThread { terminalView.append(bytes) }
                }

                override fun onBinary(bytes: ByteArray) {
                    runOnUiThread { terminalView.append(bytes) }
                }

                override fun onDisconnected(message: String, shouldFinish: Boolean, showToast: Boolean) {
                    runOnUiThread {
                        connectStarted = false
                        handleDisconnected(message, shouldFinish, showToast)
                    }
                }

                override fun onFailure(message: String) {
                    runOnUiThread {
                        connectStarted = false
                        handleDisconnected(message)
                    }
                }
            },
        )
        focusTerminal()
    }

    override fun onResume() {
        super.onResume()
        focusTerminal()
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        imeController.onWindowFocusChanged(hasFocus)
    }

    override fun onDestroy() {
        if (!emittedClosed) {
            emitClosed("user")
        }
        closed = true
        socket.close("activity closed")
        super.onDestroy()
    }

    private fun createContentView(): View {
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Color.parseColor("#020617"))
            layoutParams = ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)
        }

        val header = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(dp(12), dp(12), dp(12), dp(12))
        }
        val backButton = Button(this).apply {
            text = "뒤로"
            setOnClickListener { finish() }
        }
        statusView = TextView(this).apply {
            text = "connecting"
            setTextColor(Color.parseColor("#94a3b8"))
            gravity = Gravity.END
        }
        header.addView(backButton)
        header.addView(View(this), LinearLayout.LayoutParams(0, 0, 1f))
        header.addView(statusView)

        terminalView = NativeRemoteTerminalView(this).apply {
            layoutParams = FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)
            isClickable = true
            isFocusable = true
            isFocusableInTouchMode = true
            setCallbacks(object : NativeRemoteTerminalView.Callbacks {
                override fun onTerminalSizeChanged(columns: Int, rows: Int) {
                    currentColumns = columns
                    currentRows = rows
                    if (connectStarted) {
                        socket.sendResize(columns, rows)
                    } else {
                        openConnection()
                    }
                }

                override fun onWriteBytes(bytes: ByteArray) {
                    socket.sendInput(bytes)
                }

                override fun onCopyText(text: String) {
                    runOnUiThread { copyTextToClipboard(text) }
                }

                override fun onPasteRequested() {
                    runOnUiThread { pasteClipboard() }
                }

                override fun onBell() {
                    runOnUiThread { Toast.makeText(this@TerminalActivity, "bell", Toast.LENGTH_SHORT).show() }
                }

                override fun onTitleChanged(title: String?) {
                    runOnUiThread {
                        if (!title.isNullOrBlank()) {
                            setTitle(title)
                        }
                    }
                }

                override fun onSingleTapUp() {
                    runOnUiThread { focusTerminal() }
                }
            })
            setOnClickListener { focusTerminal() }
        }

        val terminalContainer = FrameLayout(this).apply {
            setBackgroundColor(Color.parseColor("#020617"))
            addView(terminalView)
        }

        val accessoryBar = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            setBackgroundColor(Color.parseColor("#020617"))
            setPadding(dp(8), dp(8), dp(8), dp(8))
            addView(keyButton("ESC") { terminalView.sendEscapeSequence("\u001b") }, accessoryButtonLayout())
            addView(keyButton("TAB") { terminalView.sendEscapeSequence("\t") }, accessoryButtonLayout())
            addView(keyButton("↑") { terminalView.sendEscapeSequence("\u001b[A") }, accessoryButtonLayout())
            addView(keyButton("↓") { terminalView.sendEscapeSequence("\u001b[B") }, accessoryButtonLayout())
            addView(keyButton("←") { terminalView.sendEscapeSequence("\u001b[D") }, accessoryButtonLayout())
            addView(keyButton("→") { terminalView.sendEscapeSequence("\u001b[C") }, accessoryButtonLayout())
        }

        root.addView(header)
        root.addView(terminalContainer, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f))
        root.addView(accessoryBar, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT))
        return root
    }

    private fun openConnection() {
        if (connectStarted || currentColumns <= 0 || currentRows <= 0) {
            return
        }
        connectStarted = true
        setStatus("connecting")
        socket.connect(currentColumns, currentRows)
    }

    private fun handleDisconnected(message: String, shouldFinish: Boolean = false, showToast: Boolean = true) {
        if (closed) return
        val normalizedMessage = if (isBenignDisconnectMessage(message)) "disconnected" else message
        val shouldShowToast = showToast && !isBenignDisconnectMessage(message)
        TerminalModule.log("handleDisconnected message=$normalizedMessage shouldFinish=$shouldFinish")
        setStatus(normalizedMessage)
        if (shouldFinish) {
            emitClosed("remote")
        } else {
            TerminalModule.emitDisconnected(normalizedMessage)
        }
        if (shouldShowToast) {
            Toast.makeText(this, normalizedMessage, Toast.LENGTH_SHORT).show()
        }
        if (shouldFinish) {
            finish()
        }
    }

    private fun focusTerminal() {
        imeController.focus()
        retryConnectionIfNeeded()
    }

    private fun retryConnectionIfNeeded() {
        if (closed || connectStarted || currentColumns <= 0 || currentRows <= 0) {
            return
        }
        openConnection()
    }

    private fun emitClosed(reason: String) {
        if (emittedClosed) return
        emittedClosed = true
        TerminalModule.emitClosed(reason)
    }

    private fun pasteClipboard() {
        val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as? ClipboardManager ?: return
        val item = clipboard.primaryClip?.getItemAt(0) ?: return
        val text = item.coerceToText(this)?.toString().orEmpty()
        if (text.isNotEmpty()) {
            terminalView.sendPastedText(text)
        }
    }

    private fun copyTextToClipboard(text: String) {
        if (text.isEmpty()) return
        val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as? ClipboardManager ?: return
        clipboard.setPrimaryClip(ClipData.newPlainText("terminal-selection", text))
        Toast.makeText(this, "copied", Toast.LENGTH_SHORT).show()
    }

    private fun setStatus(value: String) {
        statusView.text = value
    }

    private fun accessoryButtonLayout(): LinearLayout.LayoutParams {
        return LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f).apply {
            marginEnd = dp(6)
        }
    }

    private fun keyButton(label: String, onClick: () -> Unit): Button {
        return Button(this).apply {
            text = label
            isFocusable = false
            isFocusableInTouchMode = false
            setOnClickListener { onClick() }
        }
    }

    private fun dp(value: Int): Int {
        return (resources.displayMetrics.density * value).toInt()
    }

    companion object {
        private const val EXTRA_HOST_URL = "hostUrl"
        private const val EXTRA_AUTH_TOKEN = "authToken"
        private const val EXTRA_SESSION_NAME = "sessionName"

        fun intent(context: Context, hostUrl: String, authToken: String, sessionName: String): Intent {
            return Intent(context, TerminalActivity::class.java)
                .putExtra(EXTRA_HOST_URL, hostUrl)
                .putExtra(EXTRA_AUTH_TOKEN, authToken)
                .putExtra(EXTRA_SESSION_NAME, sessionName)
        }
    }
}
