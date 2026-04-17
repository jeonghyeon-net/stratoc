package com.stratoc.mobile.terminal.resize

data class TerminalViewport(val columns: Int, val rows: Int)

class TerminalResizeCoordinator {
    var lastViewport: TerminalViewport? = null
        private set

    fun update(columns: Int, rows: Int): TerminalViewport {
        return TerminalViewport(columns, rows).also { lastViewport = it }
    }
}
