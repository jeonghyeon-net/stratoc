package com.stratocmobile.terminal

import android.content.Context
import android.text.Editable
import android.text.InputType
import android.text.Selection
import android.util.AttributeSet
import android.view.KeyEvent
import android.view.View
import android.view.inputmethod.BaseInputConnection
import android.view.inputmethod.EditorInfo
import android.view.inputmethod.InputConnection

class TerminalInputEditText @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
) : View(context, attrs) {
    var onCommitText: ((String) -> Unit)? = null
    var onBackspace: (() -> Unit)? = null
    var onEnter: (() -> Unit)? = null
    var onKeyEvent: ((KeyEvent) -> Boolean)? = null

    private val inputBuffer: Editable = Editable.Factory.getInstance().newEditable("")
    private val selectionAnchor = 1
    private var compositionCommitted = false
    private var lastCommittedText = ""
    private var currentComposingText = ""
    private var deferredCommitText = ""

    init {
        isFocusable = true
        isFocusableInTouchMode = true
        alpha = 0f
        resetEditableState()
    }

    override fun onCheckIsTextEditor(): Boolean = true

    override fun onCreateInputConnection(outAttrs: EditorInfo): InputConnection {
        outAttrs.inputType = InputType.TYPE_CLASS_TEXT or
            InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS or
            InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD
        outAttrs.imeOptions = EditorInfo.IME_FLAG_NO_FULLSCREEN
        outAttrs.initialSelStart = selectionAnchor
        outAttrs.initialSelEnd = selectionAnchor
        resetEditableState()
        return object : BaseInputConnection(this, true) {
            override fun getEditable(): Editable {
                return inputBuffer
            }

            override fun finishComposingText(): Boolean {
                val pendingText = currentComposingText.ifEmpty { normalizeTerminalInput(inputBuffer) }
                super.finishComposingText()
                if (pendingText.isNotEmpty() && !compositionCommitted) {
                    onCommitText?.invoke(pendingText)
                }
                flushDeferredCommitText()
                compositionCommitted = false
                lastCommittedText = ""
                currentComposingText = ""
                resetEditableState()
                return true
            }

            override fun setComposingText(text: CharSequence?, newCursorPosition: Int): Boolean {
                val normalized = normalizeTerminalInput(text ?: "")
                if (normalized.isNotEmpty()) {
                    if (!shouldIgnoreComposingDowngrade(currentComposingText, normalized)) {
                        currentComposingText = normalized
                    }
                    compositionCommitted = false
                }
                return super.setComposingText(text, newCursorPosition)
            }

            override fun commitText(text: CharSequence?, newCursorPosition: Int): Boolean {
                val normalized = normalizeTerminalInput(text ?: "")
                val pendingBeforeCommit = currentComposingText.ifEmpty { normalizeTerminalInput(inputBuffer) }
                if (deferredCommitText.isNotEmpty() && !shouldFlushPendingBeforeCommit(normalized, pendingBeforeCommit)) {
                    flushDeferredCommitText()
                }
                if (shouldFlushPendingBeforeCommit(normalized, pendingBeforeCommit)) {
                    onCommitText?.invoke(pendingBeforeCommit)
                    super.commitText(text, newCursorPosition)
                    deferredCommitText += normalized
                    compositionCommitted = true
                    lastCommittedText = pendingBeforeCommit
                    currentComposingText = ""
                    resetEditableState()
                    return true
                }
                super.commitText(text, newCursorPosition)
                if (normalized.isNotEmpty()) {
                    onCommitText?.invoke(normalized)
                }
                compositionCommitted = normalized.isNotEmpty()
                lastCommittedText = normalized
                currentComposingText = ""
                resetEditableState()
                return true
            }

            override fun setSelection(start: Int, end: Int): Boolean {
                val currentStart = Selection.getSelectionStart(inputBuffer)
                val currentEnd = Selection.getSelectionEnd(inputBuffer)
                if (start == end && normalizeTerminalInput(inputBuffer).isEmpty()) {
                    when {
                        start < currentStart -> {
                            onKeyEvent?.invoke(KeyEvent(KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_DPAD_LEFT))
                            resetEditableState()
                            return true
                        }
                        start > currentStart -> {
                            onKeyEvent?.invoke(KeyEvent(KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_DPAD_RIGHT))
                            resetEditableState()
                            return true
                        }
                    }
                }
                return super.setSelection(start, end)
            }

            override fun performEditorAction(actionCode: Int): Boolean {
                flushEditable()
                onEnter?.invoke()
                return true
            }

            override fun deleteSurroundingText(beforeLength: Int, afterLength: Int): Boolean {
                if (normalizeTerminalInput(inputBuffer).isEmpty()) {
                    repeat(beforeLength.coerceAtLeast(0)) {
                        onBackspace?.invoke()
                    }
                }
                return super.deleteSurroundingText(beforeLength, afterLength)
            }

            override fun sendKeyEvent(event: KeyEvent): Boolean {
                if (shouldDelegateKeyEvent(event)) {
                    onKeyEvent?.let { handler ->
                        if (handler(event)) {
                            return true
                        }
                    }
                }
                if (event.action != KeyEvent.ACTION_DOWN) {
                    return super.sendKeyEvent(event)
                }
                return when (event.keyCode) {
                    KeyEvent.KEYCODE_ENTER -> {
                        flushEditable()
                        onEnter?.invoke()
                        inputBuffer.clear()
                        true
                    }
                    KeyEvent.KEYCODE_DEL -> {
                        onBackspace?.invoke()
                        inputBuffer.clear()
                        true
                    }
                    KeyEvent.KEYCODE_LANGUAGE_SWITCH -> super.sendKeyEvent(event)
                    else -> super.sendKeyEvent(event)
                }
            }
        }
    }

    fun clearEditable() {
        resetEditableState()
    }

    fun flushPendingCompositionForPrintableKey(): Boolean {
        val pending = currentComposingText.ifEmpty { normalizeTerminalInput(inputBuffer) }
        if (pending.isEmpty()) {
            return false
        }
        onCommitText?.invoke(pending)
        compositionCommitted = true
        lastCommittedText = pending
        currentComposingText = ""
        resetEditableState()
        return true
    }

    private fun flushEditable() {
        val normalized = currentComposingText.ifEmpty { normalizeTerminalInput(inputBuffer) }
        if (normalized.isNotEmpty()) {
            onCommitText?.invoke(normalized)
        }
        flushDeferredCommitText()
        compositionCommitted = false
        lastCommittedText = ""
        currentComposingText = ""
        resetEditableState()
    }

    private fun flushDeferredCommitText() {
        if (deferredCommitText.isEmpty()) {
            return
        }
        onCommitText?.invoke(deferredCommitText)
        deferredCommitText = ""
    }

    private fun shouldFlushPendingBeforeCommit(committedText: String, pendingText: String): Boolean {
        if (committedText.isEmpty() || pendingText.isEmpty()) {
            return false
        }
        if (committedText == pendingText) {
            return false
        }
        return committedText.all { it.isWhitespace() || !it.isLetterOrDigit() }
    }

    private fun shouldIgnoreComposingDowngrade(currentText: String, nextText: String): Boolean {
        if (currentText.isEmpty() || nextText.isEmpty()) {
            return false
        }
        return currentText.length == nextText.length &&
            currentText.all(::isHangulSyllable) &&
            nextText.all(::isHangulJamo)
    }

    private fun isHangulSyllable(character: Char): Boolean {
        return Character.UnicodeBlock.of(character) == Character.UnicodeBlock.HANGUL_SYLLABLES
    }

    private fun isHangulJamo(character: Char): Boolean {
        return when (Character.UnicodeBlock.of(character)) {
            Character.UnicodeBlock.HANGUL_JAMO,
            Character.UnicodeBlock.HANGUL_COMPATIBILITY_JAMO,
            Character.UnicodeBlock.HANGUL_JAMO_EXTENDED_A,
            Character.UnicodeBlock.HANGUL_JAMO_EXTENDED_B,
            -> true
            else -> false
        }
    }

    private fun resetEditableState() {
        inputBuffer.clear()
        inputBuffer.append(TERMINAL_INPUT_SENTINEL)
        inputBuffer.append(TERMINAL_INPUT_SENTINEL)
        inputBuffer.append(TERMINAL_INPUT_SENTINEL)
        Selection.setSelection(inputBuffer, selectionAnchor)
    }

    private fun shouldDelegateKeyEvent(event: KeyEvent): Boolean {
        if (event.isCtrlPressed || event.isAltPressed) {
            return true
        }
        return when (event.keyCode) {
            KeyEvent.KEYCODE_CTRL_LEFT,
            KeyEvent.KEYCODE_CTRL_RIGHT,
            KeyEvent.KEYCODE_ALT_LEFT,
            KeyEvent.KEYCODE_ALT_RIGHT,
            KeyEvent.KEYCODE_SHIFT_LEFT,
            KeyEvent.KEYCODE_SHIFT_RIGHT,
            KeyEvent.KEYCODE_ESCAPE,
            KeyEvent.KEYCODE_TAB,
            KeyEvent.KEYCODE_DPAD_UP,
            KeyEvent.KEYCODE_DPAD_DOWN,
            KeyEvent.KEYCODE_DPAD_LEFT,
            KeyEvent.KEYCODE_DPAD_RIGHT -> true
            else -> false
        }
    }
}
