package com.stratoc.mobile.terminal

class TerminalEventEmitter {
    var lastName: String? = null
        private set
    var lastBody: Map<String, Any?>? = null
        private set

    fun sendEvent(name: String, body: Map<String, Any?>) {
        lastName = name
        lastBody = body
    }
}
