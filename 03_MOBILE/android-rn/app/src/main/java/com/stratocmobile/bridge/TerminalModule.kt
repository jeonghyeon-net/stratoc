package com.stratocmobile.bridge

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import okhttp3.HttpUrl.Companion.toHttpUrlOrNull
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import okio.ByteString
import okio.ByteString.Companion.encodeUtf8
import java.security.SecureRandom
import java.security.cert.X509Certificate
import java.util.concurrent.TimeUnit
import javax.net.ssl.HostnameVerifier
import javax.net.ssl.SSLContext
import javax.net.ssl.SSLSession
import javax.net.ssl.SSLSocketFactory
import javax.net.ssl.TrustManager
import javax.net.ssl.X509TrustManager

class TerminalModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
    private val client = insecureWebSocketClient()
    private var socket: WebSocket? = null

    override fun getName(): String = "TerminalModule"

    @ReactMethod
    fun openTerminalSession(payload: com.facebook.react.bridge.ReadableMap, promise: Promise) {
        try {
            val hostUrl = payload.getString("hostUrl") ?: throw IllegalArgumentException("hostUrl missing")
            val token = payload.getString("authToken") ?: ""
            val sessionName = payload.getString("sessionName") ?: throw IllegalArgumentException("sessionName missing")
            socket?.close(1000, "replaced")
            socket = client.newWebSocket(
                Request.Builder()
                    .url(attachUrl(hostUrl, sessionName))
                    .header("Authorization", "Bearer $token")
                    .build(),
                object : WebSocketListener() {
                    override fun onOpen(webSocket: WebSocket, response: Response) {
                        emitEvent("terminalEvent", Arguments.createMap().apply {
                            putString("type", "opened")
                            putString("sessionName", sessionName)
                        })
                    }

                    override fun onMessage(webSocket: WebSocket, text: String) {
                        val control = parseControl(text)
                        if (control != null && control.first == "disconnect") {
                            emitEvent("terminalEvent", Arguments.createMap().apply {
                                putString("type", "disconnected")
                                putBoolean("retrying", false)
                                putString("message", control.second)
                            })
                            return
                        }
                        emitOutput(text)
                    }

                    override fun onMessage(webSocket: WebSocket, bytes: ByteString) {
                        emitOutput(bytes.utf8())
                    }

                    override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                        emitEvent("terminalEvent", Arguments.createMap().apply {
                            putString("type", "closed")
                            putString("reason", if (code == 1000) "user" else "remote")
                        })
                    }

                    override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                        emitEvent("terminalEvent", Arguments.createMap().apply {
                            putString("type", "closed")
                            putString("reason", "error")
                        })
                        emitEvent("terminalEvent", Arguments.createMap().apply {
                            putString("type", "disconnected")
                            putBoolean("retrying", false)
                            putString("message", t.message ?: response?.message)
                        })
                    }
                },
            )
            promise.resolve(null)
        } catch (error: Throwable) {
            promise.reject("terminal_open_failed", error.message, error)
        }
    }

    @ReactMethod
    fun sendInput(text: String, promise: Promise) {
        socket?.send(text.encodeUtf8())
        promise.resolve(null)
    }

    @ReactMethod
    fun resize(columns: Double, rows: Double, promise: Promise) {
        socket?.send("{\"type\":\"resize\",\"columns\":${columns.toInt()},\"rows\":${rows.toInt()}}")
        promise.resolve(null)
    }

    @ReactMethod
    fun close(reason: String?, promise: Promise) {
        socket?.close(1000, reason)
        socket = null
        promise.resolve(null)
    }

    @ReactMethod
    fun addListener(eventName: String) = Unit

    @ReactMethod
    fun removeListeners(count: Double) = Unit

    private fun emitOutput(value: String) {
        emitEvent("terminalOutput", Arguments.createMap().apply { putString("data", value) })
    }

    private fun emitEvent(name: String, body: com.facebook.react.bridge.WritableMap) {
        context.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java).emit(name, body)
    }
}

private fun attachUrl(hostUrl: String, sessionName: String): String {
    val normalized = if (hostUrl.contains("://")) hostUrl else "https://$hostUrl"
    val url = normalized.toHttpUrlOrNull() ?: throw IllegalArgumentException("invalid host url: $hostUrl")
    require(url.scheme == "https") { "https required: $hostUrl" }
    return url.newBuilder()
        .scheme("wss")
        .encodedPath("/api/sessions/${java.net.URLEncoder.encode(sessionName, "UTF-8")}/attach")
        .query(null)
        .fragment(null)
        .build()
        .toString()
}

private fun parseControl(value: String): Pair<String, String?>? {
    if (!value.trim().startsWith("{")) {
        return null
    }
    val type = Regex("\"type\"\\s*:\\s*\"([^\"]+)\"").find(value)?.groupValues?.get(1) ?: return null
    val reason = Regex("\"reason\"\\s*:\\s*\"([^\"]*)\"").find(value)?.groupValues?.get(1)
    return type to reason
}

private fun insecureWebSocketClient(): okhttp3.OkHttpClient {
    val tls = insecureSocketFactory()
    return okhttp3.OkHttpClient.Builder()
        .sslSocketFactory(tls.first, tls.second)
        .hostnameVerifier(object : HostnameVerifier {
            override fun verify(hostname: String?, session: SSLSession?): Boolean = true
        })
        .connectTimeout(5, TimeUnit.SECONDS)
        .readTimeout(0, TimeUnit.SECONDS)
        .build()
}

private fun insecureSocketFactory(): Pair<SSLSocketFactory, X509TrustManager> {
    val trustManager = object : X509TrustManager {
        override fun checkClientTrusted(chain: Array<out X509Certificate>?, authType: String?) = Unit
        override fun checkServerTrusted(chain: Array<out X509Certificate>?, authType: String?) = Unit
        override fun getAcceptedIssuers(): Array<X509Certificate> = emptyArray()
    }
    val sslContext = SSLContext.getInstance("TLS")
    sslContext.init(null, arrayOf<TrustManager>(trustManager), SecureRandom())
    return sslContext.socketFactory to trustManager
}
