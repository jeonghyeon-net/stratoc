package com.stratoc.mobile.terminal.transport

import java.net.URI
import java.net.http.HttpClient
import java.net.http.WebSocket
import java.nio.ByteBuffer
import java.util.concurrent.CompletableFuture

data class TerminalControlMessage(
    val type: String,
    val reason: String? = null,
    val columns: Int? = null,
    val rows: Int? = null,
)

class TerminalSessionClient(
    private val webSocketFactory: (URI, Map<String, String>) -> WebSocketSending = { uri, headers ->
        JdkWebSocketClient.connect(uri, headers)
    },
) {
    var lastConnection: ConnectionRequest? = null
        private set
    var lastResize: Pair<Int, Int>? = null
        private set
    val sentInput = mutableListOf<ByteArray>()
    var socket: WebSocketSending? = null
        private set

    fun connect(hostUrl: String, token: String, sessionName: String, columns: Int, rows: Int) {
        val request = attachRequest(hostUrl, token, sessionName, columns, rows)
        lastConnection = ConnectionRequest(hostUrl, token, sessionName, columns, rows)
        socket = webSocketFactory(request.uri, request.headers)
    }

    fun sendInput(bytes: ByteArray) {
        sentInput += bytes
        socket?.sendBinary(bytes)
    }

    fun sendResize(columns: Int, rows: Int) {
        lastResize = columns to rows
        socket?.sendText("{\"type\":\"resize\",\"columns\":$columns,\"rows\":$rows}")
    }
}

data class ConnectionRequest(
    val hostUrl: String,
    val token: String,
    val sessionName: String,
    val columns: Int,
    val rows: Int,
)

data class AttachRequest(val uri: URI, val headers: Map<String, String>)

fun attachRequest(hostUrl: String, token: String, sessionName: String, columns: Int, rows: Int): AttachRequest {
    val httpsUri = URI(hostUrl)
    require(httpsUri.scheme == "https") { "https required: $hostUrl" }
    val encodedSessionName = URI(null, null, sessionName, null).rawPath.removePrefix("/")
    val uri = URI(
        "wss",
        httpsUri.userInfo,
        httpsUri.host,
        httpsUri.port,
        "/api/sessions/$encodedSessionName/attach",
        null,
        null,
    )
    return AttachRequest(
        uri = uri,
        headers = mapOf(
            "Authorization" to "Bearer $token",
            "X-Terminal-Columns" to columns.toString(),
            "X-Terminal-Rows" to rows.toString(),
        ),
    )
}

interface WebSocketSending {
    fun sendBinary(bytes: ByteArray)
    fun sendText(text: String)
}

object JdkWebSocketClient {
    fun connect(uri: URI, headers: Map<String, String>): WebSocketSending {
        val builder = HttpClient.newHttpClient().newWebSocketBuilder()
        for ((name, value) in headers) {
            builder.header(name, value)
        }
        val socket = builder.buildAsync(uri, NoopWebSocketListener()).join()
        return object : WebSocketSending {
            override fun sendBinary(bytes: ByteArray) {
                socket.sendBinary(ByteBuffer.wrap(bytes), true).join()
            }

            override fun sendText(text: String) {
                socket.sendText(text, true).join()
            }
        }
    }
}

private class NoopWebSocketListener : WebSocket.Listener
