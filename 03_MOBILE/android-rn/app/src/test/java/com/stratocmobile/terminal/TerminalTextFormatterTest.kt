package com.stratocmobile.terminal

import org.junit.Assert.assertEquals
import org.junit.Test

class TerminalTextFormatterTest {
    @Test
    fun preservesComposedKoreanText() {
        assertEquals("한글", normalizeTerminalInput("한글"))
    }

    @Test
    fun convertsNewlineToCarriageReturn() {
        assertEquals("abc\r", normalizeTerminalInput("abc\n"))
    }
}
