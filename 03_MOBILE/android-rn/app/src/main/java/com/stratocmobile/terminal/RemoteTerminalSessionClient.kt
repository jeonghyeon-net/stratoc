package com.stratocmobile.terminal

import com.termux.terminal.TerminalSession
import com.termux.terminal.TerminalSessionClient

class RemoteTerminalSessionClient(
    private val onInvalidate: () -> Unit,
) : TerminalSessionClient {
    override fun onTextChanged(changedSession: TerminalSession) {
        onInvalidate()
    }

    override fun onTitleChanged(changedSession: TerminalSession) = Unit

    override fun onSessionFinished(finishedSession: TerminalSession) = Unit

    override fun onCopyTextToClipboard(session: TerminalSession, text: String) = Unit

    override fun onPasteTextFromClipboard(session: TerminalSession?) = Unit

    override fun onBell(session: TerminalSession) = Unit

    override fun onColorsChanged(session: TerminalSession) {
        onInvalidate()
    }

    override fun onTerminalCursorStateChange(state: Boolean) {
        onInvalidate()
    }


    override fun getTerminalCursorStyle(): Int {
        return 0
    }

    override fun logError(tag: String, message: String) = Unit

    override fun logWarn(tag: String, message: String) = Unit

    override fun logInfo(tag: String, message: String) = Unit

    override fun logDebug(tag: String, message: String) = Unit

    override fun logVerbose(tag: String, message: String) = Unit

    override fun logStackTraceWithMessage(tag: String, message: String, e: Exception) = Unit

    override fun logStackTrace(tag: String, e: Exception) = Unit
}
