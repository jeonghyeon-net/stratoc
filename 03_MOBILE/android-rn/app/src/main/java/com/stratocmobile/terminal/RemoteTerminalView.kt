package com.stratocmobile.terminal

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Typeface
import android.util.AttributeSet
import android.view.MotionEvent
import android.view.ViewConfiguration
import com.termux.terminal.TerminalEmulator
import com.termux.view.TerminalRenderer
import kotlin.math.abs
import kotlin.math.max

class RemoteTerminalView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
) : android.view.View(context, attrs) {
    private val sessionClient = RemoteTerminalSessionClient { postInvalidateOnAnimation() }
    private val terminalOutput = RemoteTerminalOutput(
        sendBytes = { bytes -> onWriteBytes?.invoke(bytes) },
        onTitleChanged = { onTitleChanged?.invoke(it) },
        onPasteRequest = { onPasteRequested?.invoke() },
        onBell = { onBell?.invoke() },
        onColorsChanged = { postInvalidateOnAnimation() },
    )
    private var renderer = TerminalRenderer(28, Typeface.MONOSPACE)
    private var emulator = TerminalEmulator(
        terminalOutput,
        80,
        24,
        null,
        sessionClient,
    )
    private var columns = 80
    private var rows = 24
    private var topRow = 0
    private var lastTouchY = 0f
    private var downTouchY = 0f
    private var scrollRemainder = 0f
    private var scrolling = false
    private val touchSlop = ViewConfiguration.get(context).scaledTouchSlop.toFloat()
    private val longPressTimeout = ViewConfiguration.getLongPressTimeout().toLong()
    private var longPressTriggered = false
    private val longPressRunnable = Runnable {
        longPressTriggered = true
        performLongClick()
    }

    var onTerminalSizeChanged: ((columns: Int, rows: Int) -> Unit)? = null
    var onWriteBytes: ((ByteArray) -> Unit)? = null
    var onTitleChanged: ((String?) -> Unit)? = null
    var onPasteRequested: (() -> Unit)? = null
    var onBell: (() -> Unit)? = null

    init {
        setBackgroundColor(Color.parseColor("#020617"))
        isFocusable = true
        isFocusableInTouchMode = true
        isLongClickable = true
    }

    fun append(bytes: ByteArray) {
        if (bytes.isEmpty()) {
            return
        }
        emulator.append(bytes, bytes.size)
        onScreenUpdated()
    }

    fun resizeTerminal(width: Int, height: Int) {
        val cellWidth = renderer.getFontWidth().toInt().coerceAtLeast(1)
        val cellHeight = renderer.getFontLineSpacing().coerceAtLeast(1)
        val nextColumns = max(20, width / cellWidth)
        val nextRows = max(8, height / cellHeight)
        if (nextColumns == columns && nextRows == rows) {
            return
        }
        columns = nextColumns
        rows = nextRows
        emulator.resize(columns, rows)
        onTerminalSizeChanged?.invoke(columns, rows)
        postInvalidateOnAnimation()
    }

    fun sendPastedText(text: String) {
        emulator.paste(text)
    }

    fun scrollToBottom() {
        if (topRow == 0) {
            return
        }
        topRow = 0
        postInvalidateOnAnimation()
    }

    fun sendMouseButton(mouseButton: Int, column: Int, row: Int, pressed: Boolean) {
        emulator.sendMouseEvent(mouseButton, column, row, pressed)
    }

    fun currentEmulator(): TerminalEmulator {
        return emulator
    }

    override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
        super.onSizeChanged(w, h, oldw, oldh)
        resizeTerminal(w.coerceAtLeast(1), h.coerceAtLeast(1))
    }

    override fun onDraw(canvas: Canvas) {
        canvas.drawColor(Color.parseColor("#020617"))
        renderer.render(emulator, canvas, topRow, -1, -1, -1, -1)
    }

    override fun onTouchEvent(event: MotionEvent): Boolean {
        when (event.actionMasked) {
            MotionEvent.ACTION_DOWN -> {
                parent?.requestDisallowInterceptTouchEvent(true)
                lastTouchY = event.y
                downTouchY = event.y
                scrollRemainder = 0f
                scrolling = false
                longPressTriggered = false
                removeCallbacks(longPressRunnable)
                postDelayed(longPressRunnable, longPressTimeout)
                return true
            }
            MotionEvent.ACTION_MOVE -> {
                val deltaFromDown = event.y - downTouchY
                if (!scrolling && abs(deltaFromDown) < touchSlop) {
                    return true
                }
                removeCallbacks(longPressRunnable)
                scrolling = true
                parent?.requestDisallowInterceptTouchEvent(true)
                val deltaY = event.y - lastTouchY
                lastTouchY = event.y
                val rowDelta = ((deltaY + scrollRemainder) / renderer.getFontLineSpacing()).toInt()
                scrollRemainder = deltaY + scrollRemainder - (rowDelta * renderer.getFontLineSpacing())
                if (rowDelta != 0) {
                    doScroll(event, rowDelta)
                }
                return true
            }
            MotionEvent.ACTION_UP -> {
                removeCallbacks(longPressRunnable)
                if (!scrolling && !longPressTriggered) {
                    performClick()
                }
                parent?.requestDisallowInterceptTouchEvent(false)
                scrolling = false
                return true
            }
            MotionEvent.ACTION_CANCEL -> {
                removeCallbacks(longPressRunnable)
                parent?.requestDisallowInterceptTouchEvent(false)
                scrolling = false
                return true
            }
        }
        return super.onTouchEvent(event)
    }

    override fun performClick(): Boolean {
        return super.performClick()
    }

    private fun onScreenUpdated() {
        val transcriptRows = emulator.getScreen().activeTranscriptRows
        if (transcriptRows <= 0) {
            topRow = 0
            emulator.clearScrollCounter()
            postInvalidateOnAnimation()
            return
        }
        if (topRow < -transcriptRows) {
            topRow = -transcriptRows
        }
        val scrollCounter = emulator.scrollCounter
        if (scrollCounter != 0 && topRow != 0) {
            topRow = (topRow - scrollCounter).coerceIn(-transcriptRows, 0)
        }
        emulator.clearScrollCounter()
        postInvalidateOnAnimation()
    }

    private fun doScroll(event: MotionEvent, deltaRows: Int) {
        val scrollUp = deltaRows > 0
        repeat(abs(deltaRows)) {
            when {
                emulator.isMouseTrackingActive -> {
                    sendMouseWheelEvent(event, if (scrollUp) TerminalEmulator.MOUSE_WHEELUP_BUTTON else TerminalEmulator.MOUSE_WHEELDOWN_BUTTON)
                }
                emulator.isAlternateBufferActive -> {
                    onWriteBytes?.invoke(if (scrollUp) "\u001b[A".encodeToByteArray() else "\u001b[B".encodeToByteArray())
                }
                else -> {
                    val transcriptRows = emulator.getScreen().activeTranscriptRows
                    if (transcriptRows > 0) {
                        topRow = (topRow + if (scrollUp) -1 else 1).coerceIn(-transcriptRows, 0)
                    }
                }
            }
        }
        postInvalidateOnAnimation()
    }

    private fun sendMouseWheelEvent(event: MotionEvent, mouseButton: Int) {
        val column = (event.x / renderer.getFontWidth()).toInt() + 1
        val row = ((event.y - renderer.getFontLineSpacing()) / renderer.getFontLineSpacing()).toInt().coerceAtLeast(0) + 1
        emulator.sendMouseEvent(mouseButton, column, row, true)
    }
}
