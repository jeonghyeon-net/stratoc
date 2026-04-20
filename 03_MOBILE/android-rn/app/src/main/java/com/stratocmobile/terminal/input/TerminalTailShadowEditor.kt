package com.stratocmobile.terminal.input

import android.text.Editable
import android.view.inputmethod.BaseInputConnection
import com.stratocmobile.terminal.normalizeTerminalInput

class TerminalTailShadowEditor {
    private var projectedCommittedText = ""

    fun debugProjectedCommittedText(): String {
        return projectedCommittedText
    }

    fun hasProjectedText(): Boolean {
        return projectedCommittedText.isNotEmpty()
    }

    fun hasActiveComposition(editable: Editable): Boolean {
        val start = BaseInputConnection.getComposingSpanStart(editable)
        val end = BaseInputConnection.getComposingSpanEnd(editable)
        return start >= 0 && end > start
    }

    fun hasLocalEditState(editable: Editable): Boolean {
        return editable.isNotEmpty() || hasProjectedText() || hasActiveComposition(editable)
    }

    fun buildSyncIntents(editable: Editable): List<TerminalInputIntent> {
        val desiredCommittedText = committedText(editable)
        val intents = mutableListOf<TerminalInputIntent>()
        val prefixLength = commonPrefixLength(projectedCommittedText, desiredCommittedText)
        val suffixLength = commonSuffixLength(projectedCommittedText, desiredCommittedText, prefixLength)
        val deleteCount = (projectedCommittedText.length - prefixLength - suffixLength).coerceAtLeast(0)
        if (deleteCount > 0) {
            intents += TerminalInputIntent.SendBackspace(deleteCount)
        }
        val insertedText = desiredCommittedText.substring(prefixLength, desiredCommittedText.length - suffixLength)
        if (insertedText.isNotEmpty()) {
            intents += TerminalInputIntent.InsertText(normalizeTerminalInput(insertedText))
        }
        projectedCommittedText = desiredCommittedText
        return intents
    }

    fun clear() {
        projectedCommittedText = ""
    }

    private fun committedText(editable: Editable): String {
        val rawText = editable.toString()
        if (rawText.isEmpty()) {
            return ""
        }
        val start = BaseInputConnection.getComposingSpanStart(editable)
        val end = BaseInputConnection.getComposingSpanEnd(editable)
        if (start < 0 || end <= start || start >= rawText.length) {
            return rawText
        }
        val safeEnd = end.coerceAtMost(rawText.length)
        return rawText.removeRange(start, safeEnd)
    }

    private fun commonPrefixLength(left: String, right: String): Int {
        val limit = minOf(left.length, right.length)
        for (index in 0 until limit) {
            if (left[index] != right[index]) {
                return index
            }
        }
        return limit
    }

    private fun commonSuffixLength(left: String, right: String, prefixLength: Int): Int {
        val leftRemaining = left.length - prefixLength
        val rightRemaining = right.length - prefixLength
        val limit = minOf(leftRemaining, rightRemaining)
        for (offset in 1..limit) {
            if (left[left.length - offset] != right[right.length - offset]) {
                return offset - 1
            }
        }
        return limit
    }
}
