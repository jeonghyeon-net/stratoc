package com.stratoc.mobile.terminal.tls

import java.util.prefs.Preferences

class HostTrustStore(
    private val preferences: Preferences = Preferences.userRoot().node("stratoc/mobile/host-trust"),
) {
    fun load(hostUrl: String): String? = preferences.get(hostUrl, null)

    fun save(hostUrl: String, fingerprint: String) {
        preferences.put(hostUrl, fingerprint)
        preferences.flushSilently()
    }

    fun clear(hostUrl: String) {
        preferences.remove(hostUrl)
        preferences.flushSilently()
    }
}

private fun Preferences.flushSilently() {
    runCatching { flush() }
}
