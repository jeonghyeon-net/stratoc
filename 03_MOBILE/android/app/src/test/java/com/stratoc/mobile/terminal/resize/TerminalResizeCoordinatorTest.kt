package com.stratoc.mobile.terminal.resize

import kotlin.test.Test
import kotlin.test.assertEquals

class TerminalResizeCoordinatorTest {
    @Test
    fun resizeMessageMatchesCliShape() {
        val viewport = TerminalResizeCoordinator().update(columns = 120, rows = 40)
        assertEquals(TerminalViewport(columns = 120, rows = 40), viewport)
    }
}
