package com.termux.view.textselection;

import android.annotation.SuppressLint;
import android.graphics.Canvas;
import android.graphics.Rect;
import android.graphics.drawable.Drawable;
import android.os.Build;
import android.os.SystemClock;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.ViewParent;
import android.view.WindowManager;
import android.widget.PopupWindow;

import com.termux.view.NativeRemoteTerminalView;
import com.termux.view.R;

@SuppressLint("ViewConstructor")
public class RemoteTextSelectionHandleView extends View {
    private final NativeRemoteTerminalView terminalView;
    private PopupWindow handle;
    private final RemoteCursorController cursorController;
    private final Drawable handleLeftDrawable;
    private final Drawable handleRightDrawable;
    private Drawable handleDrawable;
    private boolean dragging;
    final int[] tempCoords = new int[2];
    Rect tempRect;
    private int pointX;
    private int pointY;
    private float touchToWindowOffsetX;
    private float touchToWindowOffsetY;
    private float hotspotX;
    private float hotspotY;
    private float touchOffsetY;
    private int lastParentX;
    private int lastParentY;
    private int handleHeight;
    private int handleWidth;
    private final int initialOrientation;
    private int orientation;
    private long lastTime;

    public static final int LEFT = 0;
    public static final int RIGHT = 2;

    public RemoteTextSelectionHandleView(NativeRemoteTerminalView terminalView, RemoteCursorController cursorController, int initialOrientation) {
        super(terminalView.getContext());
        this.terminalView = terminalView;
        this.cursorController = cursorController;
        this.initialOrientation = initialOrientation;
        handleLeftDrawable = getContext().getDrawable(R.drawable.text_select_handle_left_material);
        handleRightDrawable = getContext().getDrawable(R.drawable.text_select_handle_right_material);
        setOrientation(initialOrientation);
    }

    private void initHandle() {
        handle = new PopupWindow(terminalView.getContext(), null, android.R.attr.textSelectHandleWindowStyle);
        handle.setSplitTouchEnabled(true);
        handle.setClippingEnabled(false);
        handle.setWidth(ViewGroup.LayoutParams.WRAP_CONTENT);
        handle.setHeight(ViewGroup.LayoutParams.WRAP_CONTENT);
        handle.setBackgroundDrawable(null);
        handle.setAnimationStyle(0);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            handle.setWindowLayoutType(WindowManager.LayoutParams.TYPE_APPLICATION_SUB_PANEL);
            handle.setEnterTransition(null);
            handle.setExitTransition(null);
        }
        handle.setContentView(this);
    }

    public void setOrientation(int orientation) {
        this.orientation = orientation;
        int width;
        switch (orientation) {
            case LEFT:
                handleDrawable = handleLeftDrawable;
                width = handleDrawable.getIntrinsicWidth();
                hotspotX = (width * 3) / 4f;
                break;
            case RIGHT:
            default:
                handleDrawable = handleRightDrawable;
                width = handleDrawable.getIntrinsicWidth();
                hotspotX = width / 4f;
                break;
        }
        handleHeight = handleDrawable.getIntrinsicHeight();
        handleWidth = width;
        touchOffsetY = -handleHeight * 0.3f;
        hotspotY = 0;
        invalidate();
    }

    public void show() {
        if (!isPositionVisible()) {
            hide();
            return;
        }
        removeFromParent();
        initHandle();
        invalidate();
        int[] coords = tempCoords;
        terminalView.getLocationInWindow(coords);
        coords[0] += pointX;
        coords[1] += pointY;
        if (handle != null) handle.showAtLocation(terminalView, 0, coords[0], coords[1]);
    }

    public void hide() {
        dragging = false;
        if (handle != null) {
            handle.dismiss();
            removeFromParent();
            handle = null;
        }
        invalidate();
    }

    public void removeFromParent() {
        if (getParent() != null) {
            ((ViewGroup) getParent()).removeView(this);
        }
    }

    public void positionAtCursor(int cx, int cy, boolean forceOrientationCheck) {
        int x = terminalView.getPointX(cx);
        int y = terminalView.getPointY(cy + 1);
        moveTo(x, y, forceOrientationCheck);
    }

    private void moveTo(int x, int y, boolean forceOrientationCheck) {
        float oldHotspotX = hotspotX;
        checkChangedOrientation(x, forceOrientationCheck);
        pointX = (int) (x - (isShowing() ? oldHotspotX : hotspotX));
        pointY = y;
        if (isPositionVisible()) {
            int[] coords = null;
            if (isShowing()) {
                coords = tempCoords;
                terminalView.getLocationInWindow(coords);
                int x1 = coords[0] + pointX;
                int y1 = coords[1] + pointY;
                if (handle != null) handle.update(x1, y1, getWidth(), getHeight());
            } else {
                show();
            }
            if (dragging) {
                if (coords == null) {
                    coords = tempCoords;
                    terminalView.getLocationInWindow(coords);
                }
                if (coords[0] != lastParentX || coords[1] != lastParentY) {
                    touchToWindowOffsetX += coords[0] - lastParentX;
                    touchToWindowOffsetY += coords[1] - lastParentY;
                    lastParentX = coords[0];
                    lastParentY = coords[1];
                }
            }
        } else {
            hide();
        }
    }

    public void changeOrientation(int orientation) {
        if (this.orientation != orientation) setOrientation(orientation);
    }

    private void checkChangedOrientation(int posX, boolean force) {
        if (!dragging && !force) return;
        long millis = SystemClock.currentThreadTimeMillis();
        if (millis - lastTime < 50 && !force) return;
        lastTime = millis;
        int left = terminalView.getLeft();
        int right = terminalView.getWidth();
        int top = terminalView.getTop();
        int bottom = terminalView.getHeight();
        if (tempRect == null) tempRect = new Rect();
        Rect clip = tempRect;
        clip.left = left + terminalView.getPaddingLeft();
        clip.top = top + terminalView.getPaddingTop();
        clip.right = right - terminalView.getPaddingRight();
        clip.bottom = bottom - terminalView.getPaddingBottom();
        ViewParent parent = terminalView.getParent();
        if (parent == null || !parent.getChildVisibleRect(terminalView, clip, null)) return;
        if (posX - handleWidth < clip.left) {
            changeOrientation(RIGHT);
        } else if (posX + handleWidth > clip.right) {
            changeOrientation(LEFT);
        } else {
            changeOrientation(initialOrientation);
        }
    }

    private boolean isPositionVisible() {
        if (dragging) return true;
        int left = 0;
        int right = terminalView.getWidth();
        int top = 0;
        int bottom = terminalView.getHeight();
        if (tempRect == null) tempRect = new Rect();
        Rect clip = tempRect;
        clip.left = left + terminalView.getPaddingLeft();
        clip.top = top + terminalView.getPaddingTop();
        clip.right = right - terminalView.getPaddingRight();
        clip.bottom = bottom - terminalView.getPaddingBottom();
        ViewParent parent = terminalView.getParent();
        if (parent == null || !parent.getChildVisibleRect(terminalView, clip, null)) return false;
        int[] coords = tempCoords;
        terminalView.getLocationInWindow(coords);
        int posX = coords[0] + pointX + (int) hotspotX;
        int posY = coords[1] + pointY + (int) hotspotY;
        return posX >= clip.left && posX <= clip.right && posY >= clip.top && posY <= clip.bottom;
    }

    @Override
    protected void onDraw(Canvas canvas) {
        int width = handleDrawable.getIntrinsicWidth();
        int height = handleDrawable.getIntrinsicHeight();
        handleDrawable.setBounds(0, 0, width, height);
        handleDrawable.draw(canvas);
    }

    @SuppressLint("ClickableViewAccessibility")
    @Override
    public boolean onTouchEvent(MotionEvent event) {
        terminalView.updateFloatingToolbarVisibility(event);
        switch (event.getActionMasked()) {
            case MotionEvent.ACTION_DOWN:
                touchToWindowOffsetX = event.getRawX() - pointX;
                touchToWindowOffsetY = event.getRawY() - pointY;
                int[] coords = tempCoords;
                terminalView.getLocationInWindow(coords);
                lastParentX = coords[0];
                lastParentY = coords[1];
                dragging = true;
                break;
            case MotionEvent.ACTION_MOVE:
                float newPosX = event.getRawX() - touchToWindowOffsetX + hotspotX;
                float newPosY = event.getRawY() - touchToWindowOffsetY + hotspotY + touchOffsetY;
                cursorController.updatePosition(this, Math.round(newPosX), Math.round(newPosY));
                break;
            case MotionEvent.ACTION_UP:
            case MotionEvent.ACTION_CANCEL:
                dragging = false;
                break;
            default:
                break;
        }
        return true;
    }

    @Override
    protected void onMeasure(int widthMeasureSpec, int heightMeasureSpec) {
        setMeasuredDimension(handleDrawable.getIntrinsicWidth(), handleDrawable.getIntrinsicHeight());
    }

    public int getHandleHeight() { return handleHeight; }
    public boolean isShowing() { return handle != null && handle.isShowing(); }
    public boolean isDragging() { return dragging; }
}
