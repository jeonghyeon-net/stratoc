package com.termux.view;

import android.annotation.SuppressLint;
import android.content.Context;
import android.graphics.Canvas;
import android.view.ActionMode;
import android.view.InputDevice;
import android.view.KeyCharacterMap;
import android.view.KeyEvent;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewConfiguration;
import android.view.ViewTreeObserver;
import android.view.inputmethod.EditorInfo;
import android.view.inputmethod.InputConnection;
import android.widget.Scroller;

import androidx.annotation.Nullable;

import com.termux.terminal.KeyHandler;
import com.termux.terminal.TerminalEmulator;
import com.termux.terminal.TerminalOutput;
import com.termux.terminal.TerminalSession;
import com.termux.terminal.TerminalSessionClient;
import com.stratocmobile.terminal.TerminalTypeface;
import com.stratocmobile.terminal.input.RemoteTerminalInputConnection;
import com.stratocmobile.terminal.input.TerminalInputIntent;
import com.termux.view.textselection.RemoteTextSelectionCursorController;

import java.nio.charset.StandardCharsets;

public final class NativeRemoteTerminalView extends View {

    public interface Callbacks {
        void onTerminalSizeChanged(int columns, int rows);
        void onWriteBytes(byte[] bytes);
        void onCopyText(String text);
        void onPasteRequested();
        void onBell();
        void onTitleChanged(@Nullable String title);
        void onSingleTapUp();
        void onSoftCtrlStateChanged(boolean armed);
        void onSoftAltStateChanged(boolean armed);
        void onSoftShiftStateChanged(boolean armed);
    }

    public TerminalEmulator mEmulator;
    public TerminalRenderer mRenderer;

    private final RemoteTerminalOutput mTerminalOutput = new RemoteTerminalOutput();
    private final RemoteTerminalSessionClient mSessionClient = new RemoteTerminalSessionClient();
    private RemoteTextSelectionCursorController mTextSelectionCursorController;
    private final GestureAndScaleRecognizer mGestureRecognizer;
    private final Scroller mScroller;
    private final int[] mDefaultSelectors = new int[]{-1, -1, -1, -1};
    private float mScrollRemainder;
    private long mMouseStartDownTime = -1;
    private int mMouseScrollStartX = -1;
    private int mMouseScrollStartY = -1;
    private int mTopRow;
    private int mCombiningAccent;

    private int mColumns = 80;
    private int mRows = 24;
    private boolean mSoftCtrlArmed;
    private boolean mSoftAltArmed;
    private boolean mSoftShiftArmed;
    private Callbacks mCallbacks;
    private RemoteTerminalInputConnection mInputConnection;

    public NativeRemoteTerminalView(Context context) {
        this(context, null);
    }

    public NativeRemoteTerminalView(Context context, @Nullable android.util.AttributeSet attrs) {
        super(context, attrs);
        mRenderer = new TerminalRenderer(28, TerminalTypeface.terminal(context));
        mGestureRecognizer = new GestureAndScaleRecognizer(context, new GestureAndScaleRecognizer.Listener() {
            boolean scrolledWithFinger;

            @Override
            public boolean onSingleTapUp(MotionEvent e) {
                if (mEmulator == null) return true;
                if (isSelectingText()) {
                    stopTextSelectionMode();
                    return true;
                }
                requestFocus();
                if (mCallbacks != null) mCallbacks.onSingleTapUp();
                return true;
            }

            @Override
            public boolean onDoubleTap(MotionEvent e) {
                return false;
            }

            @Override
            public boolean onScroll(MotionEvent e2, float dx, float dy) {
                if (mEmulator == null) return true;
                if (mEmulator.isMouseTrackingActive() && e2.isFromSource(InputDevice.SOURCE_MOUSE)) {
                    sendMouseEventCode(e2, TerminalEmulator.MOUSE_LEFT_BUTTON_MOVED, true);
                } else {
                    scrolledWithFinger = true;
                    dy += mScrollRemainder;
                    int deltaRows = (int) (dy / mRenderer.mFontLineSpacing);
                    mScrollRemainder = dy - deltaRows * mRenderer.mFontLineSpacing;
                    doScroll(e2, deltaRows);
                }
                return true;
            }

            @Override
            public boolean onFling(final MotionEvent e2, float velocityX, float velocityY) {
                if (mEmulator == null) return true;
                if (!mScroller.isFinished()) return true;
                final boolean mouseTrackingAtStartOfFling = mEmulator.isMouseTrackingActive();
                float scale = 0.25f;
                if (mouseTrackingAtStartOfFling) {
                    mScroller.fling(0, 0, 0, -(int) (velocityY * scale), 0, 0, -mEmulator.mRows / 2, mEmulator.mRows / 2);
                } else {
                    mScroller.fling(0, mTopRow, 0, -(int) (velocityY * scale), 0, 0, -mEmulator.getScreen().getActiveTranscriptRows(), 0);
                }
                post(new Runnable() {
                    private int lastY;
                    @Override
                    public void run() {
                        if (mScroller.isFinished()) return;
                        boolean more = mScroller.computeScrollOffset();
                        int newY = mScroller.getCurrY();
                        int diff = mouseTrackingAtStartOfFling ? (newY - lastY) : (newY - mTopRow);
                        doScroll(e2, diff);
                        lastY = newY;
                        if (more) post(this);
                    }
                });
                return true;
            }

            @Override
            public boolean onScale(float focusX, float focusY, float scale) {
                return true;
            }

            @Override
            public boolean onDown(float x, float y) {
                return false;
            }

            @Override
            public boolean onUp(MotionEvent e) {
                mScrollRemainder = 0f;
                if (mEmulator != null && mEmulator.isMouseTrackingActive() && !e.isFromSource(InputDevice.SOURCE_MOUSE) && !isSelectingText() && !scrolledWithFinger) {
                    sendMouseEventCode(e, TerminalEmulator.MOUSE_LEFT_BUTTON, true);
                    sendMouseEventCode(e, TerminalEmulator.MOUSE_LEFT_BUTTON, false);
                    return true;
                }
                scrolledWithFinger = false;
                return false;
            }

            @Override
            public void onLongPress(MotionEvent e) {
                if (mGestureRecognizer.isInProgress()) return;
                if (!isSelectingText()) {
                    startTextSelectionMode(e);
                }
            }
        });
        mScroller = new Scroller(context);
        setFocusable(true);
        setFocusableInTouchMode(true);
        setVerticalScrollBarEnabled(true);
    }

    public void setCallbacks(@Nullable Callbacks callbacks) {
        this.mCallbacks = callbacks;
    }

    public void append(byte[] bytes) {
        if (mEmulator == null || bytes == null || bytes.length == 0) return;
        mEmulator.append(bytes, bytes.length);
        onScreenUpdated(false);
    }

    public void sendEscapeSequence(String sequence) {
        if (sequence == null || sequence.isEmpty()) return;
        emitInput(sequence.getBytes(StandardCharsets.UTF_8), true);
    }

    public void setSoftCtrlArmed(boolean armed) {
        updateSoftCtrlArmed(armed);
    }

    public void setSoftAltArmed(boolean armed) {
        updateSoftAltArmed(armed);
    }

    public void setSoftShiftArmed(boolean armed) {
        updateSoftShiftArmed(armed);
    }

    public void sendPastedText(String text) {
        if (mEmulator == null || text == null || text.isEmpty()) return;
        stopTextSelectionMode();
        mEmulator.paste(text);
        scrollToBottom();
    }

    public void setTerminalFontScale(float scale) {
        float clamped = Math.max(0.85f, Math.min(1.45f, scale));
        int fontSize = Math.max(18, Math.round(28f * clamped));
        mRenderer = new TerminalRenderer(fontSize, TerminalTypeface.terminal(getContext()));
        updateSize();
        invalidate();
    }

    public void scrollToBottom() {
        if (mTopRow != 0) {
            mTopRow = 0;
            invalidate();
        }
    }

    public int getTopRow() {
        return mTopRow;
    }

    public void setTopRow(int topRow) {
        this.mTopRow = topRow;
    }

    public int getCursorX(int x) {
        return (int) (x / mRenderer.mFontWidth);
    }

    public int getCursorY(int y) {
        return (int) (((y - 40f) / mRenderer.mFontLineSpacing) + mTopRow);
    }

    public int getPointX(int cx) {
        if (mEmulator != null && cx > mEmulator.mColumns) cx = mEmulator.mColumns;
        return Math.round(cx * mRenderer.mFontWidth);
    }

    public int getPointY(int cy) {
        return Math.round((cy - mTopRow) * mRenderer.mFontLineSpacing);
    }

    public boolean isSelectingText() {
        return mTextSelectionCursorController != null && mTextSelectionCursorController.isActive();
    }

    public String getSelectedText() {
        return isSelectingText() && mTextSelectionCursorController != null ? mTextSelectionCursorController.getSelectedText() : null;
    }

    public void startTextSelectionMode(MotionEvent event) {
        if (!requestFocus()) return;
        getTextSelectionCursorController().show(event);
        invalidate();
    }

    public void stopTextSelectionMode() {
        if (mTextSelectionCursorController != null && mTextSelectionCursorController.hide()) {
            invalidate();
        }
    }

    private RemoteTextSelectionCursorController getTextSelectionCursorController() {
        if (mTextSelectionCursorController == null) {
            mTextSelectionCursorController = new RemoteTextSelectionCursorController(this);
            ViewTreeObserver observer = getViewTreeObserver();
            if (observer != null) {
                observer.addOnTouchModeChangeListener(mTextSelectionCursorController);
            }
        }
        return mTextSelectionCursorController;
    }

    public void updateFloatingToolbarVisibility(MotionEvent event) {
        if (mTextSelectionCursorController != null) {
            mTextSelectionCursorController.updateFloatingToolbarVisibility(event);
        }
    }

    public void onCopyTextToClipboard(String text) {
        if (mCallbacks != null) mCallbacks.onCopyText(text);
    }

    public void requestPasteFromClipboard() {
        if (mCallbacks != null) mCallbacks.onPasteRequested();
    }

    @Override
    public InputConnection onCreateInputConnection(EditorInfo outAttrs) {
        RemoteTerminalInputConnection.configureEditorInfo(outAttrs);
        mInputConnection = new RemoteTerminalInputConnection(this, new RemoteTerminalInputConnection.Callbacks() {
            @Override
            public boolean handleIntent(TerminalInputIntent intent) {
                if (intent instanceof TerminalInputIntent.InsertText) {
                    sendTextToTerminalInternal(((TerminalInputIntent.InsertText) intent).getText());
                    return true;
                }
                if (intent instanceof TerminalInputIntent.SendBackspace) {
                    int count = ((TerminalInputIntent.SendBackspace) intent).getCount();
                    for (int i = 0; i < count; i++) {
                        handleKeyDownInternal(KeyEvent.KEYCODE_DEL, new KeyEvent(KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_DEL));
                    }
                    return true;
                }
                if (intent instanceof TerminalInputIntent.SendKey) {
                    int keyCode = ((TerminalInputIntent.SendKey) intent).getKeyCode();
                    return handleKeyDownInternal(keyCode, new KeyEvent(KeyEvent.ACTION_DOWN, keyCode));
                }
                return false;
            }
        });
        return mInputConnection;
    }

    @Override
    public boolean onCheckIsTextEditor() {
        return true;
    }

    @Override
    public boolean isOpaque() {
        return true;
    }

    @Override
    protected int computeVerticalScrollRange() {
        return mEmulator == null ? 1 : mEmulator.getScreen().getActiveRows();
    }

    @Override
    protected int computeVerticalScrollExtent() {
        return mEmulator == null ? 1 : mEmulator.mRows;
    }

    @Override
    protected int computeVerticalScrollOffset() {
        return mEmulator == null ? 1 : mEmulator.getScreen().getActiveRows() + mTopRow - mEmulator.mRows;
    }

    public void onScreenUpdated(boolean skipScrolling) {
        if (mEmulator == null) return;
        int rowsInHistory = mEmulator.getScreen().getActiveTranscriptRows();
        if (mTopRow < -rowsInHistory) mTopRow = -rowsInHistory;
        if (isSelectingText()) {
            int rowShift = mEmulator.getScrollCounter();
            if (-mTopRow + rowShift > rowsInHistory) {
                stopTextSelectionMode();
            } else {
                skipScrolling = true;
                mTopRow -= rowShift;
                if (mTextSelectionCursorController != null) mTextSelectionCursorController.decrementYTextSelectionCursors(rowShift);
            }
        }
        if (!skipScrolling && mTopRow != 0) {
            if (mTopRow < -3) awakenScrollBars();
            mTopRow = 0;
        }
        mEmulator.clearScrollCounter();
        invalidate();
    }

    @Override
    protected void onSizeChanged(int w, int h, int oldw, int oldh) {
        super.onSizeChanged(w, h, oldw, oldh);
        updateSize();
    }

    public void updateSize() {
        int viewWidth = getWidth();
        int viewHeight = getHeight();
        if (viewWidth == 0 || viewHeight == 0) return;
        int newColumns = Math.max(4, (int) (viewWidth / mRenderer.mFontWidth));
        int newRows = Math.max(4, (viewHeight - mRenderer.mFontLineSpacingAndAscent) / mRenderer.mFontLineSpacing);
        if (mEmulator == null) {
            mColumns = newColumns;
            mRows = newRows;
            mEmulator = new TerminalEmulator(mTerminalOutput, newColumns, newRows, null, mSessionClient);
            if (mCallbacks != null) mCallbacks.onTerminalSizeChanged(newColumns, newRows);
            invalidate();
            return;
        }
        if (newColumns != mEmulator.mColumns || newRows != mEmulator.mRows) {
            mColumns = newColumns;
            mRows = newRows;
            mEmulator.resize(newColumns, newRows);
            mTopRow = 0;
            scrollTo(0, 0);
            if (mCallbacks != null) mCallbacks.onTerminalSizeChanged(newColumns, newRows);
            invalidate();
        }
    }

    @Override
    protected void onDraw(Canvas canvas) {
        if (mEmulator == null) {
            canvas.drawColor(0xFF000000);
            return;
        }
        int[] sel = mDefaultSelectors;
        if (mTextSelectionCursorController != null) mTextSelectionCursorController.getSelectors(sel);
        mRenderer.render(mEmulator, canvas, mTopRow, sel[0], sel[1], sel[2], sel[3]);
        if (mTextSelectionCursorController != null) mTextSelectionCursorController.render();
    }

    public int[] getColumnAndRow(MotionEvent event, boolean relativeToScroll) {
        int column = (int) (event.getX() / mRenderer.mFontWidth);
        int row = (int) ((event.getY() - mRenderer.mFontLineSpacingAndAscent) / mRenderer.mFontLineSpacing);
        if (relativeToScroll) row += mTopRow;
        return new int[]{column, row};
    }

    void sendMouseEventCode(MotionEvent event, int button, boolean pressed) {
        int[] columnAndRow = getColumnAndRow(event, false);
        int x = columnAndRow[0] + 1;
        int y = columnAndRow[1] + 1;
        if (pressed && (button == TerminalEmulator.MOUSE_WHEELDOWN_BUTTON || button == TerminalEmulator.MOUSE_WHEELUP_BUTTON)) {
            if (mMouseStartDownTime == event.getDownTime()) {
                x = mMouseScrollStartX;
                y = mMouseScrollStartY;
            } else {
                mMouseStartDownTime = event.getDownTime();
                mMouseScrollStartX = x;
                mMouseScrollStartY = y;
            }
        }
        mEmulator.sendMouseEvent(button, x, y, pressed);
    }

    void doScroll(MotionEvent event, int rowsDown) {
        boolean up = rowsDown < 0;
        int amount = Math.abs(rowsDown);
        for (int i = 0; i < amount; i++) {
            if (mEmulator.isMouseTrackingActive()) {
                sendMouseEventCode(event, up ? TerminalEmulator.MOUSE_WHEELUP_BUTTON : TerminalEmulator.MOUSE_WHEELDOWN_BUTTON, true);
            } else if (mEmulator.isAlternateBufferActive()) {
                handleKeyCode(up ? KeyEvent.KEYCODE_DPAD_UP : KeyEvent.KEYCODE_DPAD_DOWN, 0);
            } else {
                mTopRow = Math.min(0, Math.max(-(mEmulator.getScreen().getActiveTranscriptRows()), mTopRow + (up ? -1 : 1)));
                if (!awakenScrollBars()) invalidate();
            }
        }
    }

    @Override
    public boolean onGenericMotionEvent(MotionEvent event) {
        if (mEmulator != null && event.isFromSource(InputDevice.SOURCE_MOUSE) && event.getAction() == MotionEvent.ACTION_SCROLL) {
            boolean up = event.getAxisValue(MotionEvent.AXIS_VSCROLL) > 0.0f;
            doScroll(event, up ? -3 : 3);
            return true;
        }
        return false;
    }

    @SuppressLint("ClickableViewAccessibility")
    @Override
    public boolean onTouchEvent(MotionEvent event) {
        if (mEmulator == null) return true;
        if (isSelectingText()) {
            updateFloatingToolbarVisibility(event);
            mGestureRecognizer.onTouchEvent(event);
            return true;
        } else if (event.isFromSource(InputDevice.SOURCE_MOUSE)) {
            if (event.isButtonPressed(MotionEvent.BUTTON_SECONDARY)) {
                if (event.getAction() == MotionEvent.ACTION_DOWN) showContextMenu();
                return true;
            } else if (event.isButtonPressed(MotionEvent.BUTTON_TERTIARY)) {
                requestPasteFromClipboard();
                return true;
            } else if (mEmulator.isMouseTrackingActive()) {
                switch (event.getAction()) {
                    case MotionEvent.ACTION_DOWN:
                    case MotionEvent.ACTION_UP:
                        sendMouseEventCode(event, TerminalEmulator.MOUSE_LEFT_BUTTON, event.getAction() == MotionEvent.ACTION_DOWN);
                        break;
                    case MotionEvent.ACTION_MOVE:
                        sendMouseEventCode(event, TerminalEmulator.MOUSE_LEFT_BUTTON_MOVED, true);
                        break;
                }
            }
        }
        mGestureRecognizer.onTouchEvent(event);
        return true;
    }

    @Override
    public boolean onKeyPreIme(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK && isSelectingText()) {
            stopTextSelectionMode();
            return true;
        }
        return super.onKeyPreIme(keyCode, event);
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        return handleKeyDownInternal(keyCode, event) || super.onKeyDown(keyCode, event);
    }

    private boolean handleKeyDownInternal(int keyCode, KeyEvent event) {
        if (mEmulator == null) return true;
        if (isSelectingText()) stopTextSelectionMode();

        if (event.isCtrlPressed() && keyCode == KeyEvent.KEYCODE_V) {
            requestPasteFromClipboard();
            return true;
        }

        if (mInputConnection != null) {
            mInputConnection.flushPendingCompositionForPrintableKey(event);
        }

        if (event.getAction() == KeyEvent.ACTION_MULTIPLE && keyCode == KeyEvent.KEYCODE_UNKNOWN) {
            String characters = event.getCharacters();
            if (characters != null) emitInput(characters.getBytes(StandardCharsets.UTF_8), true);
            return true;
        } else if (keyCode == KeyEvent.KEYCODE_LANGUAGE_SWITCH) {
            return false;
        }

        final int metaState = event.getMetaState();
        final boolean softCtrlArmed = mSoftCtrlArmed;
        final boolean softAltArmed = mSoftAltArmed;
        final boolean softShiftArmed = mSoftShiftArmed;
        final boolean controlDown = event.isCtrlPressed() || softCtrlArmed;
        final boolean leftAltDown = ((metaState & KeyEvent.META_ALT_LEFT_ON) != 0) || softAltArmed;
        final boolean shiftDown = event.isShiftPressed() || softShiftArmed;
        final boolean rightAltDownFromEvent = (metaState & KeyEvent.META_ALT_RIGHT_ON) != 0;

        int keyMod = 0;
        if (controlDown) keyMod |= KeyHandler.KEYMOD_CTRL;
        if (event.isAltPressed() || leftAltDown) keyMod |= KeyHandler.KEYMOD_ALT;
        if (shiftDown) keyMod |= KeyHandler.KEYMOD_SHIFT;
        if (event.isNumLockOn()) keyMod |= KeyHandler.KEYMOD_NUM_LOCK;
        if (!event.isFunctionPressed() && handleKeyCode(keyCode, keyMod)) {
            if (softCtrlArmed) updateSoftCtrlArmed(false);
            if (softAltArmed) updateSoftAltArmed(false);
            if (softShiftArmed) updateSoftShiftArmed(false);
            return true;
        }

        int bitsToClear = KeyEvent.META_CTRL_MASK;
        if (!rightAltDownFromEvent) bitsToClear |= KeyEvent.META_ALT_ON | KeyEvent.META_ALT_LEFT_ON;
        int effectiveMetaState = event.getMetaState() & ~bitsToClear;
        if (shiftDown) effectiveMetaState |= KeyEvent.META_SHIFT_ON | KeyEvent.META_SHIFT_LEFT_ON;
        int result = event.getUnicodeChar(effectiveMetaState);
        if (result == 0) return false;

        int oldCombiningAccent = mCombiningAccent;
        if ((result & KeyCharacterMap.COMBINING_ACCENT) != 0) {
            if (mCombiningAccent != 0) inputCodePoint(event.getDeviceId(), mCombiningAccent, controlDown, leftAltDown);
            mCombiningAccent = result & KeyCharacterMap.COMBINING_ACCENT_MASK;
        } else {
            if (mCombiningAccent != 0) {
                int combinedChar = KeyCharacterMap.getDeadChar(mCombiningAccent, result);
                if (combinedChar > 0) result = combinedChar;
                mCombiningAccent = 0;
            }
            inputCodePoint(event.getDeviceId(), result, controlDown, leftAltDown);
        }
        if (softCtrlArmed) updateSoftCtrlArmed(false);
        if (softAltArmed) updateSoftAltArmed(false);
        if (softShiftArmed) updateSoftShiftArmed(false);
        if (mCombiningAccent != oldCombiningAccent) invalidate();
        return true;
    }

    public void inputCodePoint(int eventSource, int codePoint, boolean controlDownFromEvent, boolean leftAltDownFromEvent) {
        if (mEmulator == null) return;
        mEmulator.setCursorBlinkState(true);
        boolean controlDown = controlDownFromEvent;
        boolean altDown = leftAltDownFromEvent;

        if (controlDown) {
            if (codePoint >= 'a' && codePoint <= 'z') {
                codePoint = codePoint - 'a' + 1;
            } else if (codePoint >= 'A' && codePoint <= 'Z') {
                codePoint = codePoint - 'A' + 1;
            } else if (codePoint == ' ' || codePoint == '2') {
                codePoint = 0;
            } else if (codePoint == '[' || codePoint == '3') {
                codePoint = 27;
            } else if (codePoint == '\\' || codePoint == '4') {
                codePoint = 28;
            } else if (codePoint == ']' || codePoint == '5') {
                codePoint = 29;
            } else if (codePoint == '^' || codePoint == '6') {
                codePoint = 30;
            } else if (codePoint == '_' || codePoint == '7' || codePoint == '/') {
                codePoint = 31;
            } else if (codePoint == '8') {
                codePoint = 127;
            }
        }

        if (codePoint > -1) {
            if (eventSource > KEY_EVENT_SOURCE_SOFT_KEYBOARD) {
                switch (codePoint) {
                    case 0x02DC: codePoint = 0x007E; break;
                    case 0x02CB: codePoint = 0x0060; break;
                    case 0x02C6: codePoint = 0x005E; break;
                    default: break;
                }
            }
            emitCodePoint(altDown, codePoint);
        }
    }

    public boolean handleKeyCode(int keyCode, int keyMod) {
        if (mEmulator != null) mEmulator.setCursorBlinkState(true);
        if (handleKeyCodeAction(keyCode, keyMod)) return true;
        String code = KeyHandler.getCode(keyCode, keyMod, mEmulator.isCursorKeysApplicationMode(), mEmulator.isKeypadApplicationMode());
        if (code == null) return false;
        emitInput(code.getBytes(StandardCharsets.UTF_8), true);
        return true;
    }

    public boolean handleKeyCodeAction(int keyCode, int keyMod) {
        boolean shiftDown = (keyMod & KeyHandler.KEYMOD_SHIFT) != 0;
        switch (keyCode) {
            case KeyEvent.KEYCODE_PAGE_UP:
            case KeyEvent.KEYCODE_PAGE_DOWN:
                if (shiftDown) {
                    long time = android.os.SystemClock.uptimeMillis();
                    MotionEvent motionEvent = MotionEvent.obtain(time, time, MotionEvent.ACTION_DOWN, 0, 0, 0);
                    doScroll(motionEvent, keyCode == KeyEvent.KEYCODE_PAGE_UP ? -mEmulator.mRows : mEmulator.mRows);
                    motionEvent.recycle();
                    return true;
                }
                break;
            default:
                break;
        }
        return false;
    }

    @Override
    public boolean onKeyUp(int keyCode, KeyEvent event) {
        if (event.isSystem()) return super.onKeyUp(keyCode, event);
        return true;
    }

    @Override
    protected void onAttachedToWindow() {
        super.onAttachedToWindow();
        if (mTextSelectionCursorController != null) {
            getViewTreeObserver().addOnTouchModeChangeListener(mTextSelectionCursorController);
        }
    }

    @Override
    protected void onDetachedFromWindow() {
        super.onDetachedFromWindow();
        if (mTextSelectionCursorController != null) {
            stopTextSelectionMode();
            getViewTreeObserver().removeOnTouchModeChangeListener(mTextSelectionCursorController);
            mTextSelectionCursorController.onDetached();
        }
    }

    @Nullable
    ActionMode getTextSelectionActionMode() {
        return mTextSelectionCursorController != null ? mTextSelectionCursorController.getActionMode() : null;
    }

    private void sendTextToTerminalInternal(CharSequence text) {
        if (text == null || text.length() == 0) return;
        stopTextSelectionMode();
        boolean softCtrlArmed = mSoftCtrlArmed;
        boolean softAltArmed = mSoftAltArmed;
        boolean softShiftArmed = mSoftShiftArmed;
        if (softCtrlArmed) updateSoftCtrlArmed(false);
        if (softAltArmed) updateSoftAltArmed(false);
        if (softShiftArmed) updateSoftShiftArmed(false);
        int textLengthInChars = text.length();
        for (int i = 0; i < textLengthInChars; i++) {
            char firstChar = text.charAt(i);
            int codePoint;
            if (Character.isHighSurrogate(firstChar)) {
                if (++i < textLengthInChars) {
                    codePoint = Character.toCodePoint(firstChar, text.charAt(i));
                } else {
                    codePoint = TerminalEmulator.UNICODE_REPLACEMENT_CHAR;
                }
            } else {
                codePoint = firstChar;
            }

            boolean ctrlHeld = softCtrlArmed;
            boolean altHeld = softAltArmed;
            boolean shiftHeld = softShiftArmed;
            softCtrlArmed = false;
            softAltArmed = false;
            softShiftArmed = false;
            if (shiftHeld) {
                codePoint = shiftCodePoint(codePoint);
            }
            if (ctrlHeld && handleSoftCtrlCodePoint(codePoint)) {
                continue;
            }
            if (codePoint <= 31 && codePoint != '\u001b') {
                if (codePoint == '\n') codePoint = '\r';
                ctrlHeld = true;
                switch (codePoint) {
                    case 31: codePoint = '_'; break;
                    case 30: codePoint = '^'; break;
                    case 29: codePoint = ']'; break;
                    case 28: codePoint = '\\'; break;
                    default: codePoint += 96; break;
                }
            }
            inputCodePoint(KEY_EVENT_SOURCE_SOFT_KEYBOARD, codePoint, ctrlHeld, altHeld);
        }
    }

    private boolean handleSoftCtrlCodePoint(int codePoint) {
        if (codePoint == 'v' || codePoint == 'V') {
            requestPasteFromClipboard();
            return true;
        }
        Integer ctrlCodePoint = controlCodePointFor(codePoint);
        if (ctrlCodePoint == null) {
            return false;
        }
        emitInput(new byte[]{(byte) (int) ctrlCodePoint}, true);
        return true;
    }

    @Nullable
    private Integer controlCodePointFor(int codePoint) {
        if (codePoint >= 'a' && codePoint <= 'z') {
            return codePoint - 'a' + 1;
        }
        if (codePoint >= 'A' && codePoint <= 'Z') {
            return codePoint - 'A' + 1;
        }
        if (codePoint == ' ' || codePoint == '2') {
            return 0;
        }
        if (codePoint == '[' || codePoint == '3') {
            return 27;
        }
        if (codePoint == '\\' || codePoint == '4') {
            return 28;
        }
        if (codePoint == ']' || codePoint == '5') {
            return 29;
        }
        if (codePoint == '^' || codePoint == '6') {
            return 30;
        }
        if (codePoint == '_' || codePoint == '7' || codePoint == '/') {
            return 31;
        }
        if (codePoint == '8') {
            return 127;
        }
        return null;
    }

    private int shiftCodePoint(int codePoint) {
        if (codePoint >= 'a' && codePoint <= 'z') {
            return Character.toUpperCase(codePoint);
        }
        switch (codePoint) {
            case '`': return '~';
            case '1': return '!';
            case '2': return '@';
            case '3': return '#';
            case '4': return '$';
            case '5': return '%';
            case '6': return '^';
            case '7': return '&';
            case '8': return '*';
            case '9': return '(';
            case '0': return ')';
            case '-': return '_';
            case '=': return '+';
            case '[': return '{';
            case ']': return '}';
            case '\\': return '|';
            case ';': return ':';
            case '\'': return '"';
            case ',': return '<';
            case '.': return '>';
            case '/': return '?';
            default: return codePoint;
        }
    }

    private void updateSoftCtrlArmed(boolean armed) {
        if (mSoftCtrlArmed == armed) return;
        mSoftCtrlArmed = armed;
        if (mCallbacks != null) mCallbacks.onSoftCtrlStateChanged(armed);
    }

    private void updateSoftAltArmed(boolean armed) {
        if (mSoftAltArmed == armed) return;
        mSoftAltArmed = armed;
        if (mCallbacks != null) mCallbacks.onSoftAltStateChanged(armed);
    }

    private void updateSoftShiftArmed(boolean armed) {
        if (mSoftShiftArmed == armed) return;
        mSoftShiftArmed = armed;
        if (mCallbacks != null) mCallbacks.onSoftShiftStateChanged(armed);
    }

    private void emitCodePoint(boolean prependEscape, int codePoint) {
        if (prependEscape) emitInput(new byte[]{27}, false);
        String text = new String(Character.toChars(codePoint));
        emitInput(text.getBytes(StandardCharsets.UTF_8), true);
    }

    private void emitInput(byte[] bytes, boolean scrollToBottom) {
        if (bytes == null || bytes.length == 0) return;
        if (scrollToBottom) scrollToBottom();
        if (mCallbacks != null) mCallbacks.onWriteBytes(bytes);
    }

    private final class RemoteTerminalOutput extends TerminalOutput {
        @Override
        public void write(byte[] data, int offset, int count) {
            if (data == null || count <= 0) return;
            byte[] slice = new byte[count];
            System.arraycopy(data, offset, slice, 0, count);
            emitInput(slice, true);
        }

        @Override
        public void titleChanged(String oldTitle, String newTitle) {
            if (mCallbacks != null) mCallbacks.onTitleChanged(newTitle);
        }

        @Override
        public void onCopyTextToClipboard(String text) {
            onCopyTextToClipboard(text);
        }

        @Override
        public void onPasteTextFromClipboard() {
            requestPasteFromClipboard();
        }

        @Override
        public void onBell() {
            if (mCallbacks != null) mCallbacks.onBell();
        }

        @Override
        public void onColorsChanged() {
            postInvalidateOnAnimation();
        }
    }

    private static final class RemoteTerminalSessionClient implements TerminalSessionClient {
        @Override public void onTextChanged(TerminalSession changedSession) {}
        @Override public void onTitleChanged(TerminalSession changedSession) {}
        @Override public void onSessionFinished(TerminalSession finishedSession) {}
        @Override public void onCopyTextToClipboard(TerminalSession session, String text) {}
        @Override public void onPasteTextFromClipboard(TerminalSession session) {}
        @Override public void onBell(TerminalSession session) {}
        @Override public void onColorsChanged(TerminalSession session) {}
        @Override public void onTerminalCursorStateChange(boolean state) {}
        @Override public Integer getTerminalCursorStyle() { return TerminalEmulator.DEFAULT_TERMINAL_CURSOR_STYLE; }
        @Override public void logError(String tag, String message) {}
        @Override public void logWarn(String tag, String message) {}
        @Override public void logInfo(String tag, String message) {}
        @Override public void logDebug(String tag, String message) {}
        @Override public void logVerbose(String tag, String message) {}
        @Override public void logStackTraceWithMessage(String tag, String message, Exception e) {}
        @Override public void logStackTrace(String tag, Exception e) {}
    }

    public static final int KEY_EVENT_SOURCE_SOFT_KEYBOARD = 0;
}
