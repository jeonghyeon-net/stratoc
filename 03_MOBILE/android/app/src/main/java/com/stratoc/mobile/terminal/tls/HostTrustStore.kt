package com.stratoc.mobile.terminal.tls

class HostTrustStore {
    private val values = mutableMapOf<String, String>()

    fun load(hostUrl: String): String? = values[hostUrl]

    fun save(hostUrl: String, fingerprint: String) {
        values[hostUrl] = fingerprint
    }
}
