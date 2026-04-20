package com.stratocmobile.terminal

import com.termux.terminal.TerminalOutput

class RemoteTerminalOutput(
    private val sendBytes: (ByteArray) -> Unit,
    private val onTitleChanged: (String?) -> Unit,
    private val onPasteRequest: () -> Unit,
    private val onBell: () -> Unit,
    private val onColorsChanged: () -> Unit,
) : TerminalOutput() {
    override fun write(data: ByteArray, offset: Int, count: Int) {
        if (count <= 0) {
            return
        }
        sendBytes(data.copyOfRange(offset, offset + count))
    }

    override fun titleChanged(oldTitle: String?, newTitle: String?) {
        onTitleChanged(newTitle)
    }

    override fun onCopyTextToClipboard(text: String) = Unit

    override fun onPasteTextFromClipboard() {
        onPasteRequest()
    }

    override fun onBell() {
        onBell.invoke()
    }

    override fun onColorsChanged() {
        onColorsChanged.invoke()
    }
}
