package com.stratocmobile.terminal.ime

import android.content.Context
import android.view.View
import android.view.inputmethod.InputMethodManager

class TerminalImeController(
    private val context: Context,
    private val targetView: View,
    private val hasWindowFocus: () -> Boolean,
) {
    private var pendingShow = false

    fun focus() {
        targetView.requestFocus()
        targetView.requestFocusFromTouch()
        if (!hasWindowFocus()) {
            pendingShow = true
            return
        }
        showKeyboard()
    }

    fun onWindowFocusChanged(hasFocus: Boolean) {
        if (hasFocus && pendingShow) {
            showKeyboard()
        }
    }

    fun showKeyboard(restartInput: Boolean = false) {
        pendingShow = false
        targetView.post {
            targetView.requestFocus()
            targetView.requestFocusFromTouch()
            val manager = inputMethodManager() ?: return@post
            if (restartInput) {
                manager.restartInput(targetView)
            }
            manager.showSoftInput(targetView, InputMethodManager.SHOW_IMPLICIT)
        }
    }

    private fun inputMethodManager(): InputMethodManager? {
        return context.getSystemService(Context.INPUT_METHOD_SERVICE) as? InputMethodManager
    }
}
