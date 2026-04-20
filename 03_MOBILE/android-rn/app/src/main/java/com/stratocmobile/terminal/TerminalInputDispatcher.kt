package com.stratocmobile.terminal

import android.view.KeyEvent
import com.termux.terminal.KeyHandler
import java.nio.charset.StandardCharsets

class TerminalInputDispatcher(
    private val isCursorKeysApplicationMode: () -> Boolean,
    private val isKeypadApplicationMode: () -> Boolean,
    private val sendBytes: (ByteArray) -> Unit,
) {
    private var ctrlPressed = false
    private var altPressed = false
    private var shiftPressed = false

    fun sendText(text: String) {
        if (text.isEmpty()) {
            return
        }
        sendBytes(text.toByteArray(StandardCharsets.UTF_8))
    }

    fun sendEnter() {
        sendBytes("\r".toByteArray(StandardCharsets.UTF_8))
    }

    fun sendBackspace() {
        sendBytes(byteArrayOf(0x7f))
    }

    fun sendEscapeSequence(sequence: String) {
        sendBytes(sequence.toByteArray(StandardCharsets.UTF_8))
    }

    fun handleKeyEvent(event: KeyEvent): Boolean {
        if (event.keyCode == KeyEvent.KEYCODE_LANGUAGE_SWITCH) {
            return false
        }

        if (updateModifierState(event)) {
            return true
        }
        if (event.action == KeyEvent.ACTION_UP) {
            return shouldConsumeKeyUp(event)
        }
        if (event.action != KeyEvent.ACTION_DOWN) {
            return false
        }

        val ctrlDown = event.isCtrlPressed || ctrlPressed
        val altDown = event.isAltPressed || altPressed
        val shiftDown = event.isShiftPressed || shiftPressed

        val keyMod = buildKeyMod(ctrlDown, altDown, shiftDown, event.isNumLockOn)
        val code = KeyHandler.getCode(
            event.keyCode,
            keyMod,
            isCursorKeysApplicationMode(),
            isKeypadApplicationMode(),
        )
        if (code != null) {
            sendBytes(code.toByteArray(StandardCharsets.UTF_8))
            return true
        }

        explicitSequenceFor(event.keyCode)?.let {
            sendBytes(it.toByteArray(StandardCharsets.UTF_8))
            return true
        }

        if (event.action == KeyEvent.ACTION_MULTIPLE && event.keyCode == KeyEvent.KEYCODE_UNKNOWN) {
            val characters = event.characters.orEmpty()
            sendText(characters)
            return true
        }

        val unicodeChar = event.unicodeChar
        val fallbackCodePoint = fallbackCodePointFor(event.keyCode, shiftDown)
        val codePoint = if (unicodeChar > 0) unicodeChar else fallbackCodePoint
        if (codePoint <= 0) {
            return false
        }

        val bytes = mutableListOf<Byte>()
        encodeCodePoint(applyModifiers(codePoint, ctrlDown, shiftDown), bytes, altDown)
        if (bytes.isEmpty()) {
            return false
        }
        sendBytes(bytes.toByteArray())
        return true
    }

    private fun shouldConsumeKeyUp(event: KeyEvent): Boolean {
        val ctrlDown = event.isCtrlPressed || ctrlPressed
        val altDown = event.isAltPressed || altPressed
        val shiftDown = event.isShiftPressed || shiftPressed
        if (explicitSequenceFor(event.keyCode) != null) {
            return true
        }
        val keyMod = buildKeyMod(ctrlDown, altDown, shiftDown, event.isNumLockOn)
        if (
            KeyHandler.getCode(
                event.keyCode,
                keyMod,
                isCursorKeysApplicationMode(),
                isKeypadApplicationMode(),
            ) != null
        ) {
            return true
        }
        val unicodeChar = event.unicodeChar
        val fallbackCodePoint = fallbackCodePointFor(event.keyCode, shiftDown)
        return unicodeChar > 0 || fallbackCodePoint > 0
    }

    private fun explicitSequenceFor(keyCode: Int): String? {
        return when (keyCode) {
            KeyEvent.KEYCODE_ESCAPE -> "\u001b"
            KeyEvent.KEYCODE_TAB -> "\t"
            KeyEvent.KEYCODE_DPAD_UP -> "\u001b[A"
            KeyEvent.KEYCODE_DPAD_DOWN -> "\u001b[B"
            KeyEvent.KEYCODE_DPAD_LEFT -> "\u001b[D"
            KeyEvent.KEYCODE_DPAD_RIGHT -> "\u001b[C"
            else -> null
        }
    }

    private fun fallbackCodePointFor(keyCode: Int, shiftDown: Boolean): Int {
        return when {
            keyCode in KeyEvent.KEYCODE_A..KeyEvent.KEYCODE_Z -> {
                val base = 'a'.code + (keyCode - KeyEvent.KEYCODE_A)
                if (shiftDown) Character.toUpperCase(base) else base
            }
            keyCode in KeyEvent.KEYCODE_0..KeyEvent.KEYCODE_9 -> '0'.code + (keyCode - KeyEvent.KEYCODE_0)
            else -> 0
        }
    }

    private fun buildKeyMod(ctrl: Boolean, alt: Boolean, shift: Boolean, numLock: Boolean): Int {
        var mod = 0
        if (ctrl) mod = mod or KeyHandler.KEYMOD_CTRL
        if (alt) mod = mod or KeyHandler.KEYMOD_ALT
        if (shift) mod = mod or KeyHandler.KEYMOD_SHIFT
        if (numLock) mod = mod or KeyHandler.KEYMOD_NUM_LOCK
        return mod
    }

    private fun applyModifiers(codePoint: Int, ctrlDown: Boolean, shiftDown: Boolean): Int {
        if (!ctrlDown) {
            return if (shiftDown) Character.toUpperCase(codePoint) else codePoint
        }
        return when {
            codePoint in 'a'.code..'z'.code -> codePoint - 'a'.code + 1
            codePoint in 'A'.code..'Z'.code -> codePoint - 'A'.code + 1
            codePoint == ' '.code || codePoint == '2'.code -> 0
            codePoint == '['.code || codePoint == '3'.code -> 27
            codePoint == '\\'.code || codePoint == '4'.code -> 28
            codePoint == ']'.code || codePoint == '5'.code -> 29
            codePoint == '^'.code || codePoint == '6'.code -> 30
            codePoint == '_'.code || codePoint == '7'.code || codePoint == '/'.code -> 31
            codePoint == '8'.code -> 127
            else -> codePoint
        }
    }

    private fun updateModifierState(event: KeyEvent): Boolean {
        val pressed = event.action == KeyEvent.ACTION_DOWN
        return when (event.keyCode) {
            KeyEvent.KEYCODE_CTRL_LEFT, KeyEvent.KEYCODE_CTRL_RIGHT -> {
                ctrlPressed = pressed
                true
            }
            KeyEvent.KEYCODE_ALT_LEFT, KeyEvent.KEYCODE_ALT_RIGHT -> {
                altPressed = pressed
                true
            }
            KeyEvent.KEYCODE_SHIFT_LEFT, KeyEvent.KEYCODE_SHIFT_RIGHT -> {
                shiftPressed = pressed
                true
            }
            else -> false
        }
    }

    private fun encodeCodePoint(codePoint: Int, output: MutableList<Byte>, prependEscape: Boolean) {
        if (prependEscape) {
            output += 27.toByte()
        }
        val validCodePoint = if (codePoint < 0) 0 else codePoint
        val chars = Character.toChars(validCodePoint)
        val bytes = String(chars).toByteArray(StandardCharsets.UTF_8)
        output.addAll(bytes.toList())
    }
}
