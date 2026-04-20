package com.stratocmobile.terminal.input

import android.view.KeyEvent
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class TerminalImeStateMachineTest {
    @Test
    fun clearsStaleCompositionWhenImeSendsEmptyComposingText() {
        val state = TerminalImeStateMachine()

        state.onSetComposingText("ㅇ")
        state.onSetComposingText("")

        val decision = state.onFinishComposingText("")

        assertEquals("", decision.emitPendingText)
        assertEquals("", decision.emitDeferredText)
    }

    @Test
    fun deleteDuringCompositionStaysInsideIme() {
        val state = TerminalImeStateMachine()

        state.onSetComposingText("ㅁ")

        assertEquals(DeleteDecision.HANDLE_IN_IME, state.onDeleteSurroundingText("", 1))
    }

    @Test
    fun deleteWithEmptyBufferSendsBackspace() {
        val state = TerminalImeStateMachine()

        assertEquals(DeleteDecision.SEND_BACKSPACE, state.onDeleteSurroundingText("", 1))
    }

    @Test
    fun punctuationCommitFlushesPendingBeforeCommittedText() {
        val state = TerminalImeStateMachine()

        state.onSetComposingText("요")
        val decision = state.onCommitText("?", "요")

        assertEquals(listOf("요"), decision.emitBeforeSuper)
        assertTrue(decision.emitAfterSuper.isEmpty())

        val finish = state.onFinishComposingText("")
        assertEquals("", finish.emitPendingText)
        assertEquals("?", finish.emitDeferredText)
    }

    @Test
    fun defersStandaloneJamoCommitUntilCompositionResolves() {
        val state = TerminalImeStateMachine()

        val commit = state.onCommitText("ㅁ", "")
        assertTrue(commit.emitAfterSuper.isEmpty())

        state.onSetComposingText("ㅁ")
        state.onSetComposingText("마")
        val finish = state.onFinishComposingText("")

        assertEquals("마", finish.emitPendingText)
        assertEquals("", finish.emitDeferredText)
    }

    @Test
    fun deleteAfterPrintableFlushSendsBackspaceImmediately() {
        val state = TerminalImeStateMachine()

        state.onSetComposingText("게")
        assertEquals("게", state.flushPendingCompositionForPrintableKey(""))
        assertEquals(DeleteDecision.SEND_BACKSPACE, state.onDeleteSurroundingText("", 1))
    }

    @Test
    fun standaloneJamoAfterPunctuationDoesNotDuplicateNextSyllable() {
        val state = TerminalImeStateMachine()

        state.onSetComposingText("ㅁ")
        assertEquals("ㅁ", state.flushPendingCompositionForPrintableKey(""))
        val punctuation = state.onCommitText("?", "")
        assertEquals(listOf("?"), punctuation.emitAfterSuper)

        val jamoCommit = state.onCommitText("ㅁ", "")
        assertTrue(jamoCommit.emitAfterSuper.isEmpty())

        state.onSetComposingText("ㅁ")
        state.onSetComposingText("마")
        val finish = state.onFinishComposingText("")
        assertEquals("마", finish.emitPendingText)
        assertEquals("", finish.emitDeferredText)
    }

    @Test
    fun leftRightSelectionMoveDetectedOnlyForEmptyEditable() {
        val state = TerminalImeStateMachine()

        assertEquals(SelectionMove.LEFT, state.onSelectionChanged(0, 0, 1, ""))
        assertEquals(SelectionMove.RIGHT, state.onSelectionChanged(2, 2, 1, ""))
        assertEquals(SelectionMove.NONE, state.onSelectionChanged(0, 1, 1, ""))
        assertEquals(SelectionMove.NONE, state.onSelectionChanged(0, 0, 1, "x"))
    }

}
