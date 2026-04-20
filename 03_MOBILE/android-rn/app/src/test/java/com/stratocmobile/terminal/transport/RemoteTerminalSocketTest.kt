package com.stratocmobile.terminal.transport

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class RemoteTerminalSocketTest {
    @Test
    fun buildsAttachUrlFromHostWithoutScheme() {
        assertEquals(
            "https://example.com/api/sessions/dev%20shell/attach",
            attachUrl("example.com", "dev shell"),
        )
    }

    @Test
    fun parsesDisconnectControlPayload() {
        assertEquals(
            "disconnect" to "session ended",
            parseControl("{\"type\":\"disconnect\",\"reason\":\"session ended\"}"),
        )
    }

    @Test
    fun finishesOnNormalSocketClose() {
        assertTrue(shouldFinishOnSocketClosed(1000, "closed"))
    }

    @Test
    fun detectsReplacementMessage() {
        assertTrue(isReplacedConnection("replaced by newer connection"))
        assertFalse(isReplacedConnection("network failed"))
    }
}
