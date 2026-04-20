package com.stratocmobile.terminal

const val TERMINAL_INPUT_SENTINEL: Char = '\u200B'

fun normalizeTerminalInput(text: CharSequence): String {
    if (text.isEmpty()) {
        return ""
    }
    val builder = StringBuilder(text.length)
    for (character in text) {
        when (character) {
            TERMINAL_INPUT_SENTINEL -> Unit
            '\n' -> builder.append('\r')
            else -> builder.append(character)
        }
    }
    return builder.toString()
}
