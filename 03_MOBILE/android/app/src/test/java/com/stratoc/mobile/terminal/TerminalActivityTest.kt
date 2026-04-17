package com.stratoc.mobile.terminal

import kotlin.test.Test
import kotlin.test.assertEquals

class TerminalActivityTest {
    @Test
    fun emitsCertificateChangedEvent() {
        val emitter = TerminalEventEmitter()
        val activity = TerminalActivity(emitter)

        activity.emitCertificateChanged("https://10.0.0.2:8443")

        assertEquals("terminalEvent", emitter.lastName)
        assertEquals("certificate-changed", emitter.lastBody?.get("type"))
        assertEquals("https://10.0.0.2:8443", emitter.lastBody?.get("hostUrl"))
    }

    @Test
    fun emitsDisconnectedEvent() {
        val emitter = TerminalEventEmitter()
        val activity = TerminalActivity(emitter)

        activity.emitDisconnected(retrying = true, message = "network lost")

        assertEquals("disconnected", emitter.lastBody?.get("type"))
        assertEquals(true, emitter.lastBody?.get("retrying"))
        assertEquals("network lost", emitter.lastBody?.get("message"))
    }
}
