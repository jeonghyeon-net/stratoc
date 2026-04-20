package com.stratocmobile.bridge

import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.stratocmobile.terminal.TerminalActivity
import java.lang.ref.WeakReference

class TerminalModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
    override fun getName(): String = "TerminalModule"

    init {
        instance = WeakReference(this)
    }

    @ReactMethod
    fun openTerminalSession(payload: ReadableMap, promise: Promise) {
        try {
            val hostUrl = payload.getString("hostUrl") ?: throw IllegalArgumentException("hostUrl missing")
            val authToken = payload.getString("authToken") ?: ""
            val sessionName = payload.getString("sessionName") ?: throw IllegalArgumentException("sessionName missing")
            val fontScale = if (payload.hasKey("fontScale")) payload.getDouble("fontScale").toFloat() else 1f
            val intent = TerminalActivity.intent(context, hostUrl, authToken, sessionName, fontScale)
            val activity = currentActivity
            if (activity != null) {
                activity.startActivity(intent)
            } else {
                intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)
                context.startActivity(intent)
            }
            promise.resolve(null)
        } catch (error: Throwable) {
            promise.reject("terminal_open_failed", error.message, error)
        }
    }

    @ReactMethod
    fun sendInput(text: String, promise: Promise) {
        promise.reject("terminal_send_failed", "android native terminal owns input")
    }

    @ReactMethod
    fun resize(columns: Double, rows: Double, promise: Promise) {
        promise.resolve(null)
    }

    @ReactMethod
    fun close(reason: String?, promise: Promise) {
        promise.resolve(null)
    }

    @ReactMethod
    fun addListener(eventName: String) = Unit

    @ReactMethod
    fun removeListeners(count: Double) = Unit

    private fun emitEvent(name: String, body: com.facebook.react.bridge.WritableMap) {
        context.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java).emit(name, body)
    }

    companion object {
        private var instance: WeakReference<TerminalModule>? = null

        fun emitOpened(sessionName: String, hostUrl: String) {
            instance?.get()?.emitEvent("terminalEvent", Arguments.createMap().apply {
                putString("type", "opened")
                putString("sessionName", sessionName)
                putString("hostUrl", hostUrl)
            })
        }

        fun emitDisconnected(sessionName: String, hostUrl: String, message: String) {
            instance?.get()?.emitEvent("terminalEvent", Arguments.createMap().apply {
                putString("type", "disconnected")
                putBoolean("retrying", false)
                putString("message", message)
                putString("sessionName", sessionName)
                putString("hostUrl", hostUrl)
            })
        }

        fun emitClosed(reason: String, sessionName: String, hostUrl: String, message: String? = null) {
            instance?.get()?.emitEvent("terminalEvent", Arguments.createMap().apply {
                putString("type", "closed")
                putString("reason", reason)
                putString("sessionName", sessionName)
                putString("hostUrl", hostUrl)
                if (!message.isNullOrBlank()) {
                    putString("message", message)
                }
            })
        }

        fun emitSoftCtrlState(sessionName: String, hostUrl: String, armed: Boolean) {
            instance?.get()?.emitEvent("terminalEvent", Arguments.createMap().apply {
                putString("type", "soft-ctrl-state")
                putString("sessionName", sessionName)
                putString("hostUrl", hostUrl)
                putBoolean("armed", armed)
            })
        }

        fun log(message: String) {
            Log.d("StratocTerminal", message)
        }
    }
}
