package com.stratoc.mobile.terminal.transport

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class TerminalSessionClientTest {
    @Test
    fun attachRequestUsesWssAndHeaders() {
        val request = attachRequest(
            hostUrl = "https://10.0.0.2:62589",
            token = "secret",
            sessionName = "session-0001",
            columns = 120,
            rows = 40,
        )

        assertEquals("wss://10.0.0.2:62589/api/sessions/session-0001/attach", request.uri.toString())
        assertEquals("Bearer secret", request.headers["Authorization"])
        assertEquals("120", request.headers["X-Terminal-Columns"])
        assertEquals("40", request.headers["X-Terminal-Rows"])
    }

    @Test
    fun terminalSessionClientSendsInputAndResize() {
        val socket = WebSocketSpy()
        val client = TerminalSessionClient { uri, headers ->
            assertEquals("wss", uri.scheme)
            assertEquals("Bearer secret", headers["Authorization"])
            socket
        }

        client.connect("https://10.0.0.2:62589", "secret", "session-0001", 120, 40)
        client.sendInput("ls\n".encodeToByteArray())
        client.sendResize(columns = 100, rows = 30)

        assertEquals(listOf("ls\n"), socket.binaryMessages.map { it.decodeToString() })
        assertTrue(socket.textMessages.single().contains("\"type\":\"resize\""))
    }
}

private class WebSocketSpy : WebSocketSending {
    val binaryMessages = mutableListOf<ByteArray>()
    val textMessages = mutableListOf<String>()

    override fun sendBinary(bytes: ByteArray) {
        binaryMessages += bytes
    }

    override fun sendText(text: String) {
        textMessages += text
    }
}
