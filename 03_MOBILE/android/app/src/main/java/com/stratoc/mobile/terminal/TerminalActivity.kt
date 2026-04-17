package com.stratoc.mobile.terminal

class TerminalActivity(private val emitter: TerminalEventEmitter = TerminalEventEmitter()) {
    fun emitCertificateChanged(hostUrl: String) {
        emitter.sendEvent(
            "terminalEvent",
            mapOf("type" to "certificate-changed", "hostUrl" to hostUrl),
        )
    }
}
