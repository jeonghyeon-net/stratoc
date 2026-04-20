package com.stratocmobile.terminal.input

import android.view.KeyEvent
import org.junit.Assert.assertEquals
import org.junit.Test

class RemoteTerminalInputConnectionTest {
    @Test
    fun keepsRawSoftArrowCodes() {
        assertEquals(
            KeyEvent.KEYCODE_DPAD_LEFT,
            RemoteTerminalInputConnection.remapSoftImeNavigationKey(KeyEvent.KEYCODE_DPAD_LEFT),
        )
        assertEquals(
            KeyEvent.KEYCODE_DPAD_RIGHT,
            RemoteTerminalInputConnection.remapSoftImeNavigationKey(KeyEvent.KEYCODE_DPAD_RIGHT),
        )
        assertEquals(
            KeyEvent.KEYCODE_DPAD_CENTER,
            RemoteTerminalInputConnection.remapSoftImeNavigationKey(KeyEvent.KEYCODE_DPAD_CENTER),
        )
    }
}
