package com.stratoc.mobile.terminal

class TerminalActivity(private val emitter: TerminalEventEmitter = TerminalEventEmitter()) {
    fun emitCertificateChanged(hostUrl: String) {
        emitter.sendEvent(
            "terminalEvent",
            mapOf("type" to "certificate-changed", "hostUrl" to hostUrl),
        )
    }

    fun emitDisconnected(retrying: Boolean, message: String?) {
        emitter.sendEvent(
            "terminalEvent",
            mapOf("type" to "disconnected", "retrying" to retrying, "message" to message),
        )
    }

    fun lastEventBody(): Map<String, Any?>? {
        return emitter.lastBody
    }
}
