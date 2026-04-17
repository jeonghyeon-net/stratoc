package com.stratoc.mobile.terminal.input

class TerminalInputMapper {
    fun bytes(text: String): ByteArray = text.encodeToByteArray()
}
