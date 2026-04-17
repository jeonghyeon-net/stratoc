package com.stratoc.mobile.terminal.tls

import java.util.prefs.Preferences
import kotlin.test.Test
import kotlin.test.assertEquals

class HostTrustStoreTest {
    @Test
    fun savesFingerprintAcrossStoreInstances() {
        val preferences = Preferences.userRoot().node("stratoc/mobile/test-host-trust")
        preferences.clear()

        val writer = HostTrustStore(preferences)
        writer.save("https://10.0.0.2:8443", "abc")

        val reader = HostTrustStore(preferences)
        assertEquals("abc", reader.load("https://10.0.0.2:8443"))
    }
}
