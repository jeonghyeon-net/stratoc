package com.stratocmobile.terminal.input

import android.content.Context
import android.text.Editable
import android.text.InputType
import android.text.Selection
import android.view.KeyEvent
import android.view.View
import android.view.inputmethod.BaseInputConnection
import android.view.inputmethod.EditorInfo
import android.view.inputmethod.ExtractedText
import android.view.inputmethod.ExtractedTextRequest
import android.view.inputmethod.InputMethodManager
import android.view.inputmethod.SurroundingText

class RemoteTerminalInputConnection(
    private val targetView: View,
    private val callbacks: Callbacks,
) : BaseInputConnection(targetView, true) {
    interface Callbacks {
        fun handleIntent(intent: TerminalInputIntent): Boolean
    }

    private val inputBuffer: Editable = Editable.Factory.getInstance().newEditable("")
    private val shadowEditor = TerminalTailShadowEditor()
    private var reconcileScheduled = false
    private var pendingStandaloneJamoCommit = false
    private var navigationSelection = NAVIGATION_ANCHOR
    private var lastHandledImeNavigationDownKeyCode: Int? = null
    private val reconcileRunnable = Runnable {
        reconcileScheduled = false
        flushPendingEditsNow()
    }

    override fun getEditable(): Editable {
        return inputBuffer
    }

    override fun getTextBeforeCursor(n: Int, flags: Int): CharSequence {
        return if (shouldUseNavigationContext()) {
            " ".repeat(minOf(n.coerceAtLeast(0), navigationSelection))
        } else {
            super.getTextBeforeCursor(n, flags) ?: ""
        }
    }

    override fun getTextAfterCursor(n: Int, flags: Int): CharSequence {
        return if (shouldUseNavigationContext()) {
            " ".repeat(minOf(n.coerceAtLeast(0), NAVIGATION_BUFFER_LENGTH - navigationSelection))
        } else {
            super.getTextAfterCursor(n, flags) ?: ""
        }
    }

    override fun getSelectedText(flags: Int): CharSequence {
        return if (shouldUseNavigationContext()) {
            ""
        } else {
            super.getSelectedText(flags) ?: ""
        }
    }

    override fun getSurroundingText(beforeLength: Int, afterLength: Int, flags: Int): SurroundingText? {
        if (!shouldUseNavigationContext()) {
            return null
        }
        val text = " ".repeat(NAVIGATION_BUFFER_LENGTH)
        return SurroundingText(text, navigationSelection, navigationSelection, 0)
    }

    override fun getExtractedText(request: ExtractedTextRequest?, flags: Int): ExtractedText? {
        if (!shouldUseNavigationContext()) {
            return null
        }
        return ExtractedText().apply {
            text = " ".repeat(NAVIGATION_BUFFER_LENGTH)
            startOffset = 0
            partialStartOffset = -1
            partialEndOffset = -1
            selectionStart = navigationSelection
            selectionEnd = navigationSelection
        }
    }

    override fun setComposingText(text: CharSequence?, newCursorPosition: Int): Boolean {
        val normalized = text?.toString().orEmpty()
        logState("before setComposingText text='${text ?: ""}' newCursor=$newCursorPosition")
        val result = super.setComposingText(text, newCursorPosition)
        logState("after setComposingText text='${text ?: ""}' newCursor=$newCursorPosition")
        notifySelectionChanged()
        if (pendingStandaloneJamoCommit) {
            if (normalized.all(::isHangulJamo)) {
                return result
            }
            pendingStandaloneJamoCommit = false
        }
        scheduleReconcile()
        return result
    }

    override fun commitText(text: CharSequence?, newCursorPosition: Int): Boolean {
        val normalized = text?.toString().orEmpty()
        flushPendingEditsBeforeMutation()
        logState("before commitText text='${text ?: ""}' newCursor=$newCursorPosition")
        val result = super.commitText(text, newCursorPosition)
        logState("after commitText text='${text ?: ""}' newCursor=$newCursorPosition")
        notifySelectionChanged()
        if (shouldHoldStandaloneJamoCommit(normalized)) {
            pendingStandaloneJamoCommit = true
            scheduleReconcile(STANDALONE_JAMO_FLUSH_DELAY_MS)
            return result
        }
        pendingStandaloneJamoCommit = false
        scheduleReconcile()
        return result
    }

    override fun finishComposingText(): Boolean {
        logState("before finishComposingText")
        val result = super.finishComposingText()
        logState("after finishComposingText")
        notifySelectionChanged()
        pendingStandaloneJamoCommit = false
        scheduleReconcile()
        return result
    }

    override fun deleteSurroundingText(beforeLength: Int, afterLength: Int): Boolean {
        flushPendingEditsBeforeMutation(flushPendingStandalone = false)
        logState("before deleteSurroundingText before=$beforeLength after=$afterLength")
        if (!shadowEditor.hasLocalEditState(inputBuffer)) {
            if (beforeLength > 0) {
                callbacks.handleIntent(TerminalInputIntent.SendBackspace(beforeLength))
                notifySelectionChanged()
                return true
            }
            val result = super.deleteSurroundingText(beforeLength, afterLength)
            notifySelectionChanged()
            return result
        }
        val result = super.deleteSurroundingText(beforeLength, afterLength)
        notifySelectionChanged()
        scheduleReconcile()
        return result
    }

    override fun setSelection(start: Int, end: Int): Boolean {
        val currentStart = if (shouldUseNavigationContext()) navigationSelection else Selection.getSelectionStart(inputBuffer)
        val currentEnd = if (shouldUseNavigationContext()) navigationSelection else Selection.getSelectionEnd(inputBuffer)
        logState("setSelection start=$start end=$end currentStart=$currentStart currentEnd=$currentEnd")
        if (shouldUseNavigationContext() && start == end) {
            val handled = when {
                start < currentStart -> {
                    navigationSelection = NAVIGATION_ANCHOR
                    callbacks.handleIntent(TerminalInputIntent.SendKey(KeyEvent.KEYCODE_DPAD_LEFT))
                }
                start > currentStart -> {
                    navigationSelection = NAVIGATION_ANCHOR
                    callbacks.handleIntent(TerminalInputIntent.SendKey(KeyEvent.KEYCODE_DPAD_RIGHT))
                }
                else -> true
            }
            notifySelectionChanged()
            return handled
        }
        val result = super.setSelection(start, end)
        notifySelectionChanged()
        return result
    }

    override fun performEditorAction(actionCode: Int): Boolean {
        flushPendingEditsBeforeMutation(force = true)
        val handled = callbacks.handleIntent(TerminalInputIntent.SendKey(KeyEvent.KEYCODE_ENTER))
        clearShadowEditor()
        return handled || super.performEditorAction(actionCode)
    }

    override fun sendKeyEvent(event: KeyEvent): Boolean {
        val normalizedKeyCode = remapSoftImeNavigationKey(event.keyCode)
        if (normalizedKeyCode in imeSpecialKeyCodes) {
            if (event.action == KeyEvent.ACTION_UP) {
                val shouldHandleOnUp = lastHandledImeNavigationDownKeyCode != normalizedKeyCode
                lastHandledImeNavigationDownKeyCode = null
                if (!shouldHandleOnUp) {
                    return true
                }
                return handleSpecialImeKey(normalizedKeyCode, event)
            }
            if (event.action != KeyEvent.ACTION_DOWN) {
                return true
            }
            lastHandledImeNavigationDownKeyCode = normalizedKeyCode
            return handleSpecialImeKey(normalizedKeyCode, event)
        }
        if (event.action != KeyEvent.ACTION_DOWN) {
            return super.sendKeyEvent(event)
        }
        return when (normalizedKeyCode) {
            KeyEvent.KEYCODE_DEL -> handleDeleteKeyEvent(event)
            else -> super.sendKeyEvent(event)
        }
    }

    private fun handleSpecialImeKey(keyCode: Int, event: KeyEvent): Boolean {
        if (keyCode == KeyEvent.KEYCODE_DEL) {
            return handleDeleteKeyEvent(event)
        }
        flushPendingEditsBeforeMutation(force = true)
        val handled = callbacks.handleIntent(TerminalInputIntent.SendKey(keyCode))
        clearShadowEditor()
        return handled
    }

    fun flushPendingCompositionForPrintableKey(event: KeyEvent): Boolean {
        if (!shouldFlushCompositionBeforeKeyEvent(event)) {
            return false
        }
        if (!shadowEditor.hasActiveComposition(inputBuffer)) {
            return false
        }
        super.finishComposingText()
        flushPendingEditsNow()
        return true
    }

    fun flushPendingEditsNow() {
        if (reconcileScheduled) {
            targetView.removeCallbacks(reconcileRunnable)
            reconcileScheduled = false
        }
        logState("flushPendingEditsNow before")
        val intents = shadowEditor.buildSyncIntents(inputBuffer)
        intents.forEach { callbacks.handleIntent(it) }
        compactEditableToCompositionOnly()
        notifySelectionChanged()
        logState("flushPendingEditsNow after")
    }

    private fun handleDeleteKeyEvent(event: KeyEvent): Boolean {
        flushPendingEditsBeforeMutation(flushPendingStandalone = false)
        if (!shadowEditor.hasLocalEditState(inputBuffer)) {
            val handled = callbacks.handleIntent(TerminalInputIntent.SendBackspace(1))
            notifySelectionChanged()
            return handled
        }
        pendingStandaloneJamoCommit = false
        val result = super.sendKeyEvent(event)
        notifySelectionChanged()
        scheduleReconcile()
        return result
    }

    private fun flushPendingEditsBeforeMutation(force: Boolean = false, flushPendingStandalone: Boolean = true) {
        if (pendingStandaloneJamoCommit && !flushPendingStandalone) {
            return
        }
        if (!reconcileScheduled) {
            return
        }
        if (!force && shadowEditor.hasActiveComposition(inputBuffer)) {
            return
        }
        flushPendingEditsNow()
    }

    private fun scheduleReconcile(delayMillis: Long = 0L) {
        if (reconcileScheduled) {
            return
        }
        reconcileScheduled = true
        targetView.removeCallbacks(reconcileRunnable)
        if (delayMillis > 0L) {
            targetView.postDelayed(reconcileRunnable, delayMillis)
            return
        }
        targetView.post(reconcileRunnable)
    }

    private fun clearShadowEditor() {
        pendingStandaloneJamoCommit = false
        navigationSelection = NAVIGATION_ANCHOR
        shadowEditor.clear()
        inputBuffer.clear()
        Selection.setSelection(inputBuffer, 0)
        notifySelectionChanged()
        logState("clearShadowEditor")
    }

    private fun compactEditableToCompositionOnly() {
        val composingStart = BaseInputConnection.getComposingSpanStart(inputBuffer)
        val composingEnd = BaseInputConnection.getComposingSpanEnd(inputBuffer)
        val composingText = if (composingStart >= 0 && composingEnd > composingStart) {
            inputBuffer.subSequence(composingStart, composingEnd).toString()
        } else {
            ""
        }
        shadowEditor.clear()
        inputBuffer.clear()
        if (composingText.isNotEmpty()) {
            inputBuffer.append(composingText)
            BaseInputConnection.setComposingSpans(inputBuffer)
            Selection.setSelection(inputBuffer, composingText.length)
        } else {
            Selection.setSelection(inputBuffer, 0)
        }
    }

    override fun requestCursorUpdates(cursorUpdateMode: Int): Boolean {
        notifySelectionChanged()
        return true
    }

    private fun notifySelectionChanged() {
        val inputMethodManager = targetView.context.getSystemService(Context.INPUT_METHOD_SERVICE) as? InputMethodManager ?: return
        val selectionStart: Int
        val selectionEnd: Int
        val composingStart: Int
        val composingEnd: Int
        if (shouldUseNavigationContext()) {
            selectionStart = navigationSelection
            selectionEnd = navigationSelection
            composingStart = -1
            composingEnd = -1
        } else {
            selectionStart = Selection.getSelectionStart(inputBuffer).coerceAtLeast(0)
            selectionEnd = Selection.getSelectionEnd(inputBuffer).coerceAtLeast(selectionStart)
            composingStart = BaseInputConnection.getComposingSpanStart(inputBuffer)
            composingEnd = BaseInputConnection.getComposingSpanEnd(inputBuffer)
        }
        inputMethodManager.updateSelection(targetView, selectionStart, selectionEnd, composingStart, composingEnd)
    }

    @Suppress("UNUSED_PARAMETER")
    private fun logState(prefix: String) = Unit

    private fun shouldUseNavigationContext(): Boolean {
        return !pendingStandaloneJamoCommit && !shadowEditor.hasLocalEditState(inputBuffer)
    }

    private fun shouldHoldStandaloneJamoCommit(text: String): Boolean {
        if (text.isEmpty()) {
            return false
        }
        return text.all(::isHangulJamo) && !shadowEditor.hasActiveComposition(inputBuffer)
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

    private fun shouldFlushCompositionBeforeKeyEvent(event: KeyEvent): Boolean {
        if (event.action != KeyEvent.ACTION_DOWN) return false
        if (event.isCtrlPressed || event.isAltPressed) return false
        val codePoint = event.unicodeChar
        if (codePoint <= 0) return false
        val character = codePoint.toChar()
        return !character.isLetterOrDigit() && !character.isWhitespace()
    }

    companion object {
        @JvmStatic
        fun configureEditorInfo(outAttrs: EditorInfo) {
            outAttrs.inputType = InputType.TYPE_CLASS_TEXT or
                InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD or
                InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS
            outAttrs.imeOptions = EditorInfo.IME_FLAG_NO_FULLSCREEN
            outAttrs.initialSelStart = NAVIGATION_ANCHOR
            outAttrs.initialSelEnd = NAVIGATION_ANCHOR
        }

        internal fun remapSoftImeNavigationKey(keyCode: Int): Int {
            return keyCode
        }

        private val imeSpecialKeyCodes = setOf(
            KeyEvent.KEYCODE_DEL,
            KeyEvent.KEYCODE_ENTER,
            KeyEvent.KEYCODE_TAB,
            KeyEvent.KEYCODE_ESCAPE,
            KeyEvent.KEYCODE_DPAD_UP,
            KeyEvent.KEYCODE_DPAD_DOWN,
            KeyEvent.KEYCODE_DPAD_LEFT,
            KeyEvent.KEYCODE_DPAD_RIGHT,
        )

        private const val NAVIGATION_ANCHOR = 1
        private const val NAVIGATION_BUFFER_LENGTH = 2
        private const val STANDALONE_JAMO_FLUSH_DELAY_MS = 16L
    }
}
