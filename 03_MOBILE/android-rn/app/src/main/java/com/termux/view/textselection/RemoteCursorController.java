package com.termux.view.textselection;

import android.view.MotionEvent;
import android.view.ViewTreeObserver;

public interface RemoteCursorController extends ViewTreeObserver.OnTouchModeChangeListener {
    void show(MotionEvent event);
    boolean hide();
    void render();
    void updatePosition(RemoteTextSelectionHandleView handle, int x, int y);
    boolean onTouchEvent(MotionEvent event);
    void onDetached();
    boolean isActive();
}
