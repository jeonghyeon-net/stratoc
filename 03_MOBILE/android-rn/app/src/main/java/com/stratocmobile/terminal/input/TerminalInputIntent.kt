package com.stratocmobile.terminal.input

sealed interface TerminalInputIntent {
    data class InsertText(val text: String) : TerminalInputIntent
    data class SendKey(val keyCode: Int) : TerminalInputIntent
    data class SendBackspace(val count: Int) : TerminalInputIntent
}
