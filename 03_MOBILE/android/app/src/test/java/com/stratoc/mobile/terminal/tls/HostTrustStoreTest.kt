package com.stratoc.mobile.terminal.tls

import kotlin.test.Test
import kotlin.test.assertEquals

class HostTrustStoreTest {
    @Test
    fun savesFingerprintByHostUrl() {
        val store = HostTrustStore()
        store.save("https://10.0.0.2:8443", "abc")
        assertEquals("abc", store.load("https://10.0.0.2:8443"))
    }
}
