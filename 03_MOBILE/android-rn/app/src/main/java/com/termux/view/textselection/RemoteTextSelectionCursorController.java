package com.termux.view.textselection;

import android.content.ClipboardManager;
import android.content.Context;
import android.graphics.Rect;
import android.os.Build;
import android.text.TextUtils;
import android.view.ActionMode;
import android.view.Menu;
import android.view.MenuItem;
import android.view.MotionEvent;
import android.view.View;

import androidx.annotation.Nullable;

import com.termux.terminal.TerminalBuffer;
import com.termux.terminal.WcWidth;
import com.termux.view.NativeRemoteTerminalView;
import com.termux.view.R;

public class RemoteTextSelectionCursorController implements RemoteCursorController {
    private final NativeRemoteTerminalView terminalView;
    private final RemoteTextSelectionHandleView startHandle;
    private final RemoteTextSelectionHandleView endHandle;
    private boolean selecting;
    private long showStartTime = System.currentTimeMillis();
    private final int handleHeight;
    private int selX1 = -1, selX2 = -1, selY1 = -1, selY2 = -1;
    private ActionMode actionMode;

    public static final int ACTION_COPY = 1;
    public static final int ACTION_PASTE = 2;

    public RemoteTextSelectionCursorController(NativeRemoteTerminalView terminalView) {
        this.terminalView = terminalView;
        startHandle = new RemoteTextSelectionHandleView(terminalView, this, RemoteTextSelectionHandleView.LEFT);
        endHandle = new RemoteTextSelectionHandleView(terminalView, this, RemoteTextSelectionHandleView.RIGHT);
        handleHeight = Math.max(startHandle.getHandleHeight(), endHandle.getHandleHeight());
    }

    @Override
    public void show(MotionEvent event) {
        setInitialTextSelectionPosition(event);
        startHandle.positionAtCursor(selX1, selY1, true);
        endHandle.positionAtCursor(selX2 + 1, selY2, true);
        setActionModeCallbacks();
        showStartTime = System.currentTimeMillis();
        selecting = true;
    }

    @Override
    public boolean hide() {
        if (!isActive()) return false;
        if (System.currentTimeMillis() - showStartTime < 300) return false;
        startHandle.hide();
        endHandle.hide();
        if (actionMode != null) actionMode.finish();
        selX1 = selY1 = selX2 = selY2 = -1;
        selecting = false;
        return true;
    }

    @Override
    public void render() {
        if (!isActive()) return;
        startHandle.positionAtCursor(selX1, selY1, false);
        endHandle.positionAtCursor(selX2 + 1, selY2, false);
        if (actionMode != null) actionMode.invalidate();
    }

    public void setInitialTextSelectionPosition(MotionEvent event) {
        int[] columnAndRow = terminalView.getColumnAndRow(event, true);
        selX1 = selX2 = columnAndRow[0];
        selY1 = selY2 = columnAndRow[1];
        TerminalBuffer screen = terminalView.mEmulator.getScreen();
        if (!" ".equals(screen.getSelectedText(selX1, selY1, selX1, selY1))) {
            while (selX1 > 0 && !"".equals(screen.getSelectedText(selX1 - 1, selY1, selX1 - 1, selY1))) selX1--;
            while (selX2 < terminalView.mEmulator.mColumns - 1 && !"".equals(screen.getSelectedText(selX2 + 1, selY1, selX2 + 1, selY1))) selX2++;
        }
    }

    public void setActionModeCallbacks() {
        final ActionMode.Callback callback = new ActionMode.Callback() {
            @Override
            public boolean onCreateActionMode(ActionMode mode, Menu menu) {
                int show = MenuItem.SHOW_AS_ACTION_IF_ROOM | MenuItem.SHOW_AS_ACTION_WITH_TEXT;
                ClipboardManager clipboard = (ClipboardManager) terminalView.getContext().getSystemService(Context.CLIPBOARD_SERVICE);
                menu.add(Menu.NONE, ACTION_COPY, Menu.NONE, R.string.copy_text).setShowAsAction(show);
                menu.add(Menu.NONE, ACTION_PASTE, Menu.NONE, R.string.paste_text).setEnabled(clipboard != null && clipboard.hasPrimaryClip()).setShowAsAction(show);
                return true;
            }
            @Override public boolean onPrepareActionMode(ActionMode mode, Menu menu) { return false; }
            @Override public void onDestroyActionMode(ActionMode mode) {}
            @Override
            public boolean onActionItemClicked(ActionMode mode, MenuItem item) {
                if (!isActive()) return true;
                if (item.getItemId() == ACTION_COPY) {
                    terminalView.onCopyTextToClipboard(getSelectedText());
                    terminalView.stopTextSelectionMode();
                    return true;
                } else if (item.getItemId() == ACTION_PASTE) {
                    terminalView.stopTextSelectionMode();
                    terminalView.requestPasteFromClipboard();
                    return true;
                }
                return false;
            }
        };
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
            actionMode = terminalView.startActionMode(callback);
            return;
        }
        actionMode = terminalView.startActionMode(new ActionMode.Callback2() {
            @Override public boolean onCreateActionMode(ActionMode mode, Menu menu) { return callback.onCreateActionMode(mode, menu); }
            @Override public boolean onPrepareActionMode(ActionMode mode, Menu menu) { return false; }
            @Override public void onDestroyActionMode(ActionMode mode) {}
            @Override public boolean onActionItemClicked(ActionMode mode, MenuItem item) { return callback.onActionItemClicked(mode, item); }
            @Override
            public void onGetContentRect(ActionMode mode, View view, Rect outRect) {
                int x1 = Math.round(selX1 * terminalView.mRenderer.getFontWidth());
                int x2 = Math.round(selX2 * terminalView.mRenderer.getFontWidth());
                int y1 = Math.round((selY1 - 1 - terminalView.getTopRow()) * terminalView.mRenderer.getFontLineSpacing());
                int y2 = Math.round((selY2 + 1 - terminalView.getTopRow()) * terminalView.mRenderer.getFontLineSpacing());
                if (x1 > x2) {
                    int tmp = x1; x1 = x2; x2 = tmp;
                }
                int terminalBottom = terminalView.getBottom();
                int top = Math.min(y1 + handleHeight, terminalBottom);
                int bottom = Math.min(y2 + handleHeight, terminalBottom);
                outRect.set(x1, top, x2, bottom);
            }
        }, ActionMode.TYPE_FLOATING);
    }

    @Override
    public void updatePosition(RemoteTextSelectionHandleView handle, int x, int y) {
        TerminalBuffer screen = terminalView.mEmulator.getScreen();
        final int scrollRows = screen.getActiveRows() - terminalView.mEmulator.mRows;
        if (handle == startHandle) {
            selX1 = terminalView.getCursorX(x);
            selY1 = terminalView.getCursorY(y);
            if (selX1 < 0) selX1 = 0;
            if (selY1 < -scrollRows) selY1 = -scrollRows;
            else if (selY1 > terminalView.mEmulator.mRows - 1) selY1 = terminalView.mEmulator.mRows - 1;
            if (selY1 > selY2) selY1 = selY2;
            if (selY1 == selY2 && selX1 > selX2) selX1 = selX2;
            if (!terminalView.mEmulator.isAlternateBufferActive()) {
                int topRow = terminalView.getTopRow();
                if (selY1 <= topRow) topRow = Math.max(topRow - 1, -scrollRows);
                else if (selY1 >= topRow + terminalView.mEmulator.mRows) topRow = Math.min(topRow + 1, 0);
                terminalView.setTopRow(topRow);
            }
            selX1 = getValidCurX(screen, selY1, selX1);
        } else {
            selX2 = terminalView.getCursorX(x);
            selY2 = terminalView.getCursorY(y);
            if (selX2 < 0) selX2 = 0;
            if (selY2 < -scrollRows) selY2 = -scrollRows;
            else if (selY2 > terminalView.mEmulator.mRows - 1) selY2 = terminalView.mEmulator.mRows - 1;
            if (selY1 > selY2) selY2 = selY1;
            if (selY1 == selY2 && selX1 > selX2) selX2 = selX1;
            if (!terminalView.mEmulator.isAlternateBufferActive()) {
                int topRow = terminalView.getTopRow();
                if (selY2 <= topRow) topRow = Math.max(topRow - 1, -scrollRows);
                else if (selY2 >= topRow + terminalView.mEmulator.mRows) topRow = Math.min(topRow + 1, 0);
                terminalView.setTopRow(topRow);
            }
            selX2 = getValidCurX(screen, selY2, selX2);
        }
        terminalView.invalidate();
    }

    private int getValidCurX(TerminalBuffer screen, int cy, int cx) {
        String line = screen.getSelectedText(0, cy, cx, cy);
        if (!TextUtils.isEmpty(line)) {
            int col = 0;
            for (int i = 0, len = line.length(); i < len; i++) {
                char ch1 = line.charAt(i);
                if (ch1 == 0) break;
                int wc;
                if (Character.isHighSurrogate(ch1) && i + 1 < len) {
                    char ch2 = line.charAt(++i);
                    wc = WcWidth.width(Character.toCodePoint(ch1, ch2));
                } else {
                    wc = WcWidth.width(ch1);
                }
                int cend = col + wc;
                if (cx > col && cx < cend) return cend;
                if (cend == col) return col;
                col = cend;
            }
        }
        return cx;
    }

    public void decrementYTextSelectionCursors(int decrement) {
        selY1 -= decrement;
        selY2 -= decrement;
    }

    @Override public boolean onTouchEvent(MotionEvent event) { return false; }
    @Override public void onTouchModeChanged(boolean isInTouchMode) { if (!isInTouchMode) terminalView.stopTextSelectionMode(); }
    @Override public void onDetached() {}
    @Override public boolean isActive() { return selecting; }

    public void getSelectors(int[] sel) {
        if (sel == null || sel.length != 4) return;
        sel[0] = selY1;
        sel[1] = selY2;
        sel[2] = selX1;
        sel[3] = selX2;
    }

    public String getSelectedText() {
        return terminalView.mEmulator.getSelectedText(selX1, selY1, selX2, selY2);
    }

    @Nullable
    public ActionMode getActionMode() { return actionMode; }

    public void updateFloatingToolbarVisibility(MotionEvent event) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && actionMode != null) {
            switch (event.getActionMasked()) {
                case MotionEvent.ACTION_MOVE:
                    terminalView.removeCallbacks(terminalView::invalidate);
                    actionMode.hide(-1);
                    break;
                case MotionEvent.ACTION_UP:
                case MotionEvent.ACTION_CANCEL:
                    actionMode.hide(0);
                    break;
                default:
                    break;
            }
        }
    }
}
