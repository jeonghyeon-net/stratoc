package com.stratoc.mobile.terminal.transport

data class TerminalControlMessage(
    val type: String,
    val reason: String? = null,
    val columns: Int? = null,
    val rows: Int? = null,
)

class TerminalSessionClient {
    var lastConnection: ConnectionRequest? = null
        private set
    var lastResize: Pair<Int, Int>? = null
        private set
    val sentInput = mutableListOf<ByteArray>()

    fun connect(hostUrl: String, token: String, sessionName: String, columns: Int, rows: Int) {
        lastConnection = ConnectionRequest(hostUrl, token, sessionName, columns, rows)
    }

    fun sendInput(bytes: ByteArray) {
        sentInput += bytes
    }

    fun sendResize(columns: Int, rows: Int) {
        lastResize = columns to rows
    }
}

data class ConnectionRequest(
    val hostUrl: String,
    val token: String,
    val sessionName: String,
    val columns: Int,
    val rows: Int,
)
