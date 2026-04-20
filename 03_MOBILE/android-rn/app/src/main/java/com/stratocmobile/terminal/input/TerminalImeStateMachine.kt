package com.stratocmobile.terminal.input

import android.view.KeyEvent

enum class SelectionMove {
    NONE,
    LEFT,
    RIGHT,
}

enum class DeleteDecision {
    HANDLE_IN_IME,
    SEND_BACKSPACE,
}

data class FinishDecision(
    val emitPendingText: String,
    val emitDeferredText: String,
)

data class CommitDecision(
    val emitBeforeSuper: List<String>,
    val emitAfterSuper: List<String>,
)

class TerminalImeStateMachine {
    private var compositionCommitted = false
    private var currentComposingText = ""
    private var deferredCommitText = ""
    private var skippedCommittedEchoText = ""

    fun pendingText(normalizedEditable: String): String {
        return currentComposingText.ifEmpty { normalizedEditable }
    }

    fun onSetComposingText(normalized: String) {
        if (normalized.isEmpty()) {
            currentComposingText = ""
            compositionCommitted = false
            skippedCommittedEchoText = ""
            return
        }
        if (normalized == skippedCommittedEchoText) {
            skippedCommittedEchoText = ""
            return
        }
        skippedCommittedEchoText = ""
        if (!shouldIgnoreComposingDowngrade(currentComposingText, normalized)) {
            currentComposingText = normalized
        }
        compositionCommitted = false
    }

    fun onCommitText(normalized: String, pendingBeforeCommit: String): CommitDecision {
        val emitBeforeSuper = mutableListOf<String>()
        val emitAfterSuper = mutableListOf<String>()

        if (deferredCommitText.isNotEmpty() && !shouldFlushPendingBeforeCommit(normalized, pendingBeforeCommit)) {
            emitBeforeSuper += deferredCommitText
            deferredCommitText = ""
        }

        if (shouldFlushPendingBeforeCommit(normalized, pendingBeforeCommit)) {
            emitBeforeSuper += pendingBeforeCommit
            if (normalized.isNotEmpty()) {
                deferredCommitText += normalized
            }
            compositionCommitted = true
            currentComposingText = ""
            skippedCommittedEchoText = ""
            return CommitDecision(
                emitBeforeSuper = emitBeforeSuper,
                emitAfterSuper = emitAfterSuper,
            )
        }

        if (shouldDeferStandaloneHangulJamoCommit(normalized, pendingBeforeCommit)) {
            currentComposingText = normalized
            compositionCommitted = false
            skippedCommittedEchoText = normalized
            return CommitDecision(
                emitBeforeSuper = emitBeforeSuper,
                emitAfterSuper = emitAfterSuper,
            )
        }

        if (normalized.isNotEmpty()) {
            emitAfterSuper += normalized
            skippedCommittedEchoText = normalized
        } else {
            skippedCommittedEchoText = ""
        }
        compositionCommitted = normalized.isNotEmpty()
        currentComposingText = ""
        return CommitDecision(
            emitBeforeSuper = emitBeforeSuper,
            emitAfterSuper = emitAfterSuper,
        )
    }

    fun onFinishComposingText(normalizedEditable: String): FinishDecision {
        val pending = pendingText(normalizedEditable)
        val emitPending = if (pending.isNotEmpty() && !compositionCommitted) pending else ""
        val emitDeferred = deferredCommitText
        reset()
        return FinishDecision(
            emitPendingText = emitPending,
            emitDeferredText = emitDeferred,
        )
    }

    fun onSelectionChanged(start: Int, end: Int, currentStart: Int, normalizedEditable: String): SelectionMove {
        if (start != end || normalizedEditable.isNotEmpty()) {
            return SelectionMove.NONE
        }
        return when {
            start < currentStart -> SelectionMove.LEFT
            start > currentStart -> SelectionMove.RIGHT
            else -> SelectionMove.NONE
        }
    }

    fun onDeleteSurroundingText(normalizedEditable: String, beforeLength: Int): DeleteDecision {
        if (beforeLength <= 0) {
            return DeleteDecision.HANDLE_IN_IME
        }
        return if (compositionCommitted || pendingText(normalizedEditable).isEmpty()) {
            DeleteDecision.SEND_BACKSPACE
        } else {
            DeleteDecision.HANDLE_IN_IME
        }
    }

    fun flushPendingCompositionForPrintableKey(normalizedEditable: String): String {
        val pending = pendingText(normalizedEditable)
        if (pending.isEmpty()) {
            return ""
        }
        compositionCommitted = true
        currentComposingText = pending
        skippedCommittedEchoText = pending
        return pending
    }

    fun shouldFlushCompositionBeforeKeyEvent(event: KeyEvent): Boolean {
        if (event.action != KeyEvent.ACTION_DOWN) return false
        if (event.isCtrlPressed || event.isAltPressed) return false
        val codePoint = event.unicodeChar
        if (codePoint <= 0) return false
        val character = codePoint.toChar()
        return !character.isLetterOrDigit() && !character.isWhitespace()
    }

    fun shouldHandleAsSpecialImeKey(event: KeyEvent): Boolean {
        return when (event.keyCode) {
            KeyEvent.KEYCODE_ENTER,
            KeyEvent.KEYCODE_DEL,
            KeyEvent.KEYCODE_TAB,
            KeyEvent.KEYCODE_ESCAPE,
            KeyEvent.KEYCODE_DPAD_UP,
            KeyEvent.KEYCODE_DPAD_DOWN,
            KeyEvent.KEYCODE_DPAD_LEFT,
            KeyEvent.KEYCODE_DPAD_RIGHT,
            -> true
            else -> false
        }
    }

    fun reset() {
        compositionCommitted = false
        currentComposingText = ""
        deferredCommitText = ""
        skippedCommittedEchoText = ""
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

    private fun shouldDeferStandaloneHangulJamoCommit(committedText: String, pendingText: String): Boolean {
        if (committedText.isEmpty()) {
            return false
        }
        if (pendingText.isNotEmpty() && pendingText != committedText) {
            return false
        }
        return committedText.all(::isHangulJamo)
    }

    private fun shouldIgnoreComposingDowngrade(currentText: String, nextText: String): Boolean {
        if (currentText.isEmpty() || nextText.isEmpty() || currentText.length != nextText.length) {
            return false
        }
        return currentText.all(::isHangulSyllable) && nextText.all(::isHangulJamo)
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
}
